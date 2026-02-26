import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

const createEmailSchema = z.object({
  name: z.string().min(1, "Name is required"),
  subject: z.string().min(1, "Subject is required"),
  previewText: z.string().optional(),
  designJson: z.record(z.string(), z.unknown()).default({}),
  htmlContent: z.string().default(""),
  textContent: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return jsonResponse(templates);
  } catch {
    return errorResponse("Failed to fetch email templates", 500);
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const body = await req.json();
    const parsed = createEmailSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const template = await prisma.emailTemplate.create({
      data: {
        ...parsed.data,
        designJson: parsed.data.designJson as Prisma.InputJsonValue,
      },
    });

    return jsonResponse(template, 201);
  } catch {
    return errorResponse("Failed to create email template", 500);
  }
}
