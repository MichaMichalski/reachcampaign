import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { EmailProvider, EmailProviderType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

type ProviderConfig = {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  apiKey?: string;
  region?: string;
};

type SendEmailParams = {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
};

type SendEmailResult = {
  messageId: string;
  provider: string;
};

const SMTP_CONFIGS: Record<string, { host: string; port: number }> = {
  SENDGRID: { host: "smtp.sendgrid.net", port: 587 },
  AWS_SES: { host: "email-smtp.us-east-1.amazonaws.com", port: 587 },
  MAILGUN: { host: "smtp.mailgun.org", port: 587 },
  POSTMARK: { host: "smtp.postmarkapp.com", port: 587 },
};

function createTransporter(
  provider: EmailProvider,
  config: ProviderConfig
): Transporter {
  const type = provider.type as string;

  if (type === "SMTP") {
    return nodemailer.createTransport({
      host: config.host,
      port: config.port || 587,
      secure: config.port === 465,
      auth: { user: config.user, pass: config.pass },
    });
  }

  const smtpDefaults = SMTP_CONFIGS[type];
  const host =
    type === "AWS_SES" && config.region
      ? `email-smtp.${config.region}.amazonaws.com`
      : smtpDefaults?.host;

  return nodemailer.createTransport({
    host,
    port: smtpDefaults?.port || 587,
    secure: false,
    auth: {
      user: type === "SENDGRID" ? "apikey" : config.user || config.apiKey,
      pass: config.apiKey || config.pass,
    },
  });
}

function decryptConfig(encryptedConfig: unknown): ProviderConfig {
  const raw =
    typeof encryptedConfig === "string"
      ? encryptedConfig
      : JSON.stringify(encryptedConfig);
  try {
    const decrypted = decrypt(raw);
    return JSON.parse(decrypted) as ProviderConfig;
  } catch {
    return (
      typeof encryptedConfig === "object" ? encryptedConfig : {}
    ) as ProviderConfig;
  }
}

async function getProvidersForDomain(fromDomain: string) {
  const domain = await prisma.sendingDomain.findUnique({
    where: { domain: fromDomain },
    include: {
      providers: {
        include: { provider: true },
        where: { provider: { enabled: true } },
      },
    },
  });

  if (!domain || domain.providers.length === 0) {
    const fallback = await prisma.emailProvider.findMany({
      where: { enabled: true },
      orderBy: { priority: "asc" },
    });
    return { providers: fallback, strategy: "FAILOVER" as const };
  }

  const strategy = domain.providers[0]?.provider.strategy ?? "ROUND_ROBIN";
  return {
    providers: domain.providers.map((dp) => dp.provider),
    strategy,
  };
}

async function checkRateLimits(provider: EmailProvider): Promise<boolean> {
  const now = new Date();

  if (provider.dailyResetAt < now) {
    await prisma.emailProvider.update({
      where: { id: provider.id },
      data: {
        dailySent: 0,
        dailyResetAt: new Date(now.setHours(24, 0, 0, 0)),
      },
    });
    provider.dailySent = 0;
  }

  if (provider.dailySent >= provider.dailyLimit) return false;

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const hourlySent = await prisma.emailLog.count({
    where: {
      providerId: provider.id,
      createdAt: { gte: hourAgo },
      status: { in: ["SENT", "DELIVERED", "SENDING"] },
    },
  });

  return hourlySent < provider.hourlylimit;
}

let roundRobinIndex = 0;

function selectByRoundRobin(providers: EmailProvider[]): EmailProvider[] {
  const idx = roundRobinIndex % providers.length;
  roundRobinIndex++;
  return [...providers.slice(idx), ...providers.slice(0, idx)];
}

function selectByWeight(providers: EmailProvider[]): EmailProvider[] {
  const totalWeight = providers.reduce((sum, p) => sum + p.weight, 0);
  const random = Math.random() * totalWeight;
  let cumulative = 0;

  const sorted: EmailProvider[] = [];
  for (const provider of providers) {
    cumulative += provider.weight;
    if (cumulative >= random && sorted.length === 0) {
      sorted.unshift(provider);
    } else {
      sorted.push(provider);
    }
  }

  return sorted.length ? sorted : providers;
}

function selectByFailover(providers: EmailProvider[]): EmailProvider[] {
  return [...providers].sort((a, b) => a.priority - b.priority);
}

function orderProviders(
  providers: EmailProvider[],
  strategy: string
): EmailProvider[] {
  switch (strategy) {
    case "ROUND_ROBIN":
      return selectByRoundRobin(providers);
    case "WEIGHTED":
      return selectByWeight(providers);
    case "FAILOVER":
      return selectByFailover(providers);
    default:
      return providers;
  }
}

export async function sendEmail(
  params: SendEmailParams
): Promise<SendEmailResult> {
  const fromDomain = params.from.split("@")[1];
  const { providers, strategy } = await getProvidersForDomain(fromDomain);

  if (providers.length === 0) {
    throw new Error("No email providers available");
  }

  const ordered = orderProviders(providers, strategy);
  const errors: string[] = [];

  for (const provider of ordered) {
    const withinLimits = await checkRateLimits(provider);
    if (!withinLimits) {
      errors.push(`${provider.name}: rate limit exceeded`);
      continue;
    }

    try {
      const config = decryptConfig(provider.config);
      const transporter = createTransporter(provider, config);

      const result = await transporter.sendMail({
        from: params.from,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      });

      await prisma.emailProvider.update({
        where: { id: provider.id },
        data: { dailySent: { increment: 1 } },
      });

      return {
        messageId: result.messageId,
        provider: provider.id,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${provider.name}: ${message}`);
    }
  }

  throw new Error(
    `All providers failed to send email: ${errors.join("; ")}`
  );
}
