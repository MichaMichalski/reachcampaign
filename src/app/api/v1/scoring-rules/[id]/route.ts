import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

const updateScoringRuleSchema = z.object({
  name: z.string().min(1).optional(),
  eventType: z
    .enum([
      "EMAIL_OPEN",
      "EMAIL_CLICK",
      "PAGE_VIEW",
      "FORM_SUBMIT",
      "CAMPAIGN_TRIGGER",
    ])
    .optional(),
  points: z.number().int().optional(),
  enabled: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateScoringRuleSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const existing = await prisma.scoringRule.findUnique({ where: { id } });
    if (!existing) return errorResponse("Scoring rule not found", 404);

    const rule = await prisma.scoringRule.update({
      where: { id },
      data: parsed.data,
    });

    return jsonResponse(rule);
  } catch {
    return errorResponse("Failed to update scoring rule", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const existing = await prisma.scoringRule.findUnique({ where: { id } });
    if (!existing) return errorResponse("Scoring rule not found", 404);

    await prisma.scoringRule.delete({ where: { id } });
    return jsonResponse({ message: "Scoring rule deleted" });
  } catch {
    return errorResponse("Failed to delete scoring rule", 500);
  }
}
