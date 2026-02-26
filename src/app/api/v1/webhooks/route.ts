import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

const VALID_EVENTS = [
  "contact.created",
  "contact.updated",
  "email.sent",
  "email.opened",
  "email.bounced",
  "form.submitted",
  "campaign.completed",
] as const;

const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum(VALID_EVENTS)).min(1, "At least one event is required"),
  secret: z.string().min(8).optional(),
});

export async function GET(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const webhooks = await prisma.webhook.findMany({
      orderBy: { createdAt: "desc" },
    });
    return jsonResponse({ data: webhooks });
  } catch {
    return errorResponse("Failed to fetch webhooks", 500);
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const body = await req.json();
    const parsed = createWebhookSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const webhook = await prisma.webhook.create({
      data: parsed.data,
    });

    return jsonResponse(webhook, 201);
  } catch {
    return errorResponse("Failed to create webhook", 500);
  }
}
