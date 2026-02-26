import { NextRequest, NextResponse } from "next/server";
import { handleBounce, handleComplaint } from "@/lib/email/bounce-handler";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

function verifyWebhookSecret(req: NextRequest): boolean {
  const secret =
    req.headers.get("x-webhook-secret") ||
    req.nextUrl.searchParams.get("secret");
  return secret === WEBHOOK_SECRET && WEBHOOK_SECRET.length > 0;
}

type SendGridEvent = {
  event: string;
  email?: string;
  sg_message_id?: string;
  reason?: string;
  type?: string;
};

type MailgunEvent = {
  "event-data"?: {
    event: string;
    message?: { headers?: { "message-id"?: string } };
    reason?: string;
    severity?: string;
  };
};

type SESNotification = {
  Type?: string;
  Message?: string;
  notificationType?: string;
  bounce?: {
    bounceType: string;
    bouncedRecipients: Array<{ emailAddress: string }>;
  };
  complaint?: {
    complainedRecipients: Array<{ emailAddress: string }>;
  };
  mail?: { messageId: string };
};

function cleanMessageId(raw: string): string {
  return raw.replace(/^<|>$/g, "").split(".")[0] || raw;
}

async function processSendGridEvents(events: SendGridEvent[]) {
  for (const event of events) {
    const messageId = event.sg_message_id
      ? cleanMessageId(event.sg_message_id)
      : undefined;
    if (!messageId) continue;

    if (event.event === "bounce" || event.event === "dropped") {
      await handleBounce({
        messageId,
        bounceType: event.type === "permanent" ? "hard" : "soft",
        reason: event.reason,
      });
    } else if (event.event === "spamreport") {
      await handleComplaint({ messageId, reason: event.reason });
    }
  }
}

async function processMailgunEvent(payload: MailgunEvent) {
  const data = payload["event-data"];
  if (!data) return;

  const messageId = data.message?.headers?.["message-id"];
  if (!messageId) return;

  const cleaned = cleanMessageId(messageId);

  if (data.event === "failed") {
    await handleBounce({
      messageId: cleaned,
      bounceType: data.severity === "permanent" ? "hard" : "soft",
      reason: data.reason,
    });
  } else if (data.event === "complained") {
    await handleComplaint({ messageId: cleaned, reason: data.reason });
  }
}

async function processSESNotification(payload: SESNotification) {
  let notification = payload;

  if (payload.Type === "Notification" && payload.Message) {
    notification = JSON.parse(payload.Message) as SESNotification;
  }

  const messageId = notification.mail?.messageId;
  if (!messageId) return;

  if (notification.notificationType === "Bounce" && notification.bounce) {
    await handleBounce({
      messageId,
      bounceType: notification.bounce.bounceType === "Permanent" ? "hard" : "soft",
    });
  } else if (notification.notificationType === "Complaint") {
    await handleComplaint({ messageId });
  }
}

export async function POST(req: NextRequest) {
  if (!verifyWebhookSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (Array.isArray(body)) {
      await processSendGridEvents(body as SendGridEvent[]);
    } else if (body["event-data"]) {
      await processMailgunEvent(body as MailgunEvent);
    } else if (body.Type || body.notificationType) {
      await processSESNotification(body as SESNotification);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("[bounce-webhook] Error processing webhook:", err);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
