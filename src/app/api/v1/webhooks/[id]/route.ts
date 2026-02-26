import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

const VALID_EVENTS = [
  "contact.created",
  "contact.updated",
  "email.sent",
  "email.opened",
  "email.bounced",
  "form.submitted",
  "campaign.completed",
] as const;

const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.enum(VALID_EVENTS)).min(1).optional(),
  secret: z.string().min(8).optional(),
  enabled: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const webhook = await prisma.webhook.findUnique({ where: { id } });
    if (!webhook) return errorResponse("Webhook not found", 404);
    return jsonResponse(webhook);
  } catch {
    return errorResponse("Failed to fetch webhook", 500);
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateWebhookSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const existing = await prisma.webhook.findUnique({ where: { id } });
    if (!existing) return errorResponse("Webhook not found", 404);

    const webhook = await prisma.webhook.update({
      where: { id },
      data: parsed.data,
    });

    return jsonResponse(webhook);
  } catch {
    return errorResponse("Failed to update webhook", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const existing = await prisma.webhook.findUnique({ where: { id } });
    if (!existing) return errorResponse("Webhook not found", 404);

    await prisma.webhook.delete({ where: { id } });
    return jsonResponse({ message: "Webhook deleted" });
  } catch {
    return errorResponse("Failed to delete webhook", 500);
  }
}
