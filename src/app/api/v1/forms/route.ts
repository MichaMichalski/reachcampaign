import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

const formFieldSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  type: z.enum(["text", "email", "number", "textarea", "select", "checkbox", "radio"]),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
});

const createFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  landingPageId: z.string().optional(),
  fields: z.array(formFieldSchema).default([]),
  successMessage: z.string().default("Thank you for your submission!"),
  redirectUrl: z.string().url().optional().or(z.literal("")),
});

export async function GET(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const forms = await prisma.form.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { submissions: true } },
        landingPage: { select: { id: true, name: true } },
      },
    });
    return jsonResponse(forms);
  } catch {
    return errorResponse("Failed to fetch forms", 500);
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const body = await req.json();
    const parsed = createFormSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const { redirectUrl, ...rest } = parsed.data;
    const form = await prisma.form.create({
      data: {
        ...rest,
        redirectUrl: redirectUrl || null,
      },
    });

    return jsonResponse(form, 201);
  } catch {
    return errorResponse("Failed to create form", 500);
  }
}
