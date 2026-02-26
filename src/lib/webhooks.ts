import { createHmac } from "crypto";
import { prisma } from "@/lib/db";

export async function dispatchWebhook(
  event: string,
  data: unknown
): Promise<void> {
  const webhooks = await prisma.webhook.findMany({
    where: {
      enabled: true,
      events: { has: event },
    },
  });

  const payload = JSON.stringify({ event, data, timestamp: new Date().toISOString() });

  const deliveries = webhooks.map(async (webhook) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Webhook-Event": event,
    };

    if (webhook.secret) {
      const signature = createHmac("sha256", webhook.secret)
        .update(payload)
        .digest("hex");
      headers["X-Webhook-Signature"] = `sha256=${signature}`;
    }

    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers,
        body: payload,
        signal: AbortSignal.timeout(10_000),
      });

      console.log(
        `[webhook] Delivered ${event} to ${webhook.url} — status ${response.status}`
      );
    } catch (err) {
      console.error(
        `[webhook] Failed to deliver ${event} to ${webhook.url}:`,
        err instanceof Error ? err.message : err
      );
    }
  });

  Promise.allSettled(deliveries).catch(() => {});
}
