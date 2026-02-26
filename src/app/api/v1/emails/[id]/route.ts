import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

const updateEmailSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  previewText: z.string().optional(),
  designJson: z.record(z.string(), z.unknown()).optional(),
  htmlContent: z.string().optional(),
  textContent: z.string().optional(),
});

export async function GET(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const template = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!template) return errorResponse("Template not found", 404);
    return jsonResponse(template);
  } catch {
    return errorResponse("Failed to fetch template", 500);
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateEmailSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const existing = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!existing) return errorResponse("Template not found", 404);

    const { designJson, ...rest } = parsed.data;
    const template = await prisma.emailTemplate.update({
      where: { id },
      data: {
        ...rest,
        ...(designJson !== undefined && {
          designJson: designJson as Prisma.InputJsonValue,
        }),
      },
    });

    return jsonResponse(template);
  } catch {
    return errorResponse("Failed to update template", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const existing = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!existing) return errorResponse("Template not found", 404);

    await prisma.emailTemplate.delete({ where: { id } });
    return jsonResponse({ message: "Template deleted" });
  } catch {
    return errorResponse("Failed to delete template", 500);
  }
}
