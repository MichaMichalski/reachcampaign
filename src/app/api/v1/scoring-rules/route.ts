import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

const createScoringRuleSchema = z.object({
  name: z.string().min(1, "Name is required"),
  eventType: z.enum([
    "EMAIL_OPEN",
    "EMAIL_CLICK",
    "PAGE_VIEW",
    "FORM_SUBMIT",
    "CAMPAIGN_TRIGGER",
  ]),
  points: z.number().int(),
  enabled: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const rules = await prisma.scoringRule.findMany({
      orderBy: { createdAt: "desc" },
    });
    return jsonResponse({ data: rules });
  } catch {
    return errorResponse("Failed to fetch scoring rules", 500);
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const body = await req.json();
    const parsed = createScoringRuleSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const rule = await prisma.scoringRule.create({
      data: parsed.data,
    });

    return jsonResponse(rule, 201);
  } catch {
    return errorResponse("Failed to create scoring rule", 500);
  }
}
