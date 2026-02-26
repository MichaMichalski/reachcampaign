import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

const formFieldSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  type: z.enum(["text", "email", "number", "textarea", "select", "checkbox", "radio"]),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
});

const updateFormSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  landingPageId: z.string().nullable().optional(),
  fields: z.array(formFieldSchema).optional(),
  successMessage: z.string().optional(),
  redirectUrl: z.string().url().nullable().optional().or(z.literal("")),
});

export async function GET(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const form = await prisma.form.findUnique({
      where: { id },
      include: {
        _count: { select: { submissions: true } },
        landingPage: { select: { id: true, name: true } },
      },
    });
    if (!form) return errorResponse("Form not found", 404);
    return jsonResponse(form);
  } catch {
    return errorResponse("Failed to fetch form", 500);
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateFormSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const existing = await prisma.form.findUnique({ where: { id } });
    if (!existing) return errorResponse("Form not found", 404);

    const { redirectUrl, ...rest } = parsed.data;
    const form = await prisma.form.update({
      where: { id },
      data: {
        ...rest,
        ...(redirectUrl !== undefined
          ? { redirectUrl: redirectUrl || null }
          : {}),
      },
    });

    return jsonResponse(form);
  } catch {
    return errorResponse("Failed to update form", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const existing = await prisma.form.findUnique({ where: { id } });
    if (!existing) return errorResponse("Form not found", 404);

    await prisma.form.delete({ where: { id } });
    return jsonResponse({ message: "Form deleted" });
  } catch {
    return errorResponse("Failed to delete form", 500);
  }
}
