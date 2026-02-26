import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

const updatePageSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  designJson: z.record(z.string(), z.unknown()).optional(),
  htmlContent: z.string().optional(),
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
});

export async function GET(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const page = await prisma.landingPage.findUnique({
      where: { id },
      include: { forms: true },
    });
    if (!page) return errorResponse("Page not found", 404);
    return jsonResponse(page);
  } catch {
    return errorResponse("Failed to fetch page", 500);
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updatePageSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const existing = await prisma.landingPage.findUnique({ where: { id } });
    if (!existing) return errorResponse("Page not found", 404);

    if (parsed.data.slug && parsed.data.slug !== existing.slug) {
      const slugTaken = await prisma.landingPage.findUnique({
        where: { slug: parsed.data.slug },
      });
      if (slugTaken) return errorResponse("A page with this slug already exists");
    }

    const { designJson, ...restData } = parsed.data;
    const page = await prisma.landingPage.update({
      where: { id },
      data: {
        ...restData,
        ...(designJson !== undefined && {
          designJson: designJson as Prisma.InputJsonValue,
        }),
      },
    });

    return jsonResponse(page);
  } catch {
    return errorResponse("Failed to update page", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const existing = await prisma.landingPage.findUnique({ where: { id } });
    if (!existing) return errorResponse("Page not found", 404);

    await prisma.landingPage.delete({ where: { id } });
    return jsonResponse({ message: "Page deleted" });
  } catch {
    return errorResponse("Failed to delete page", 500);
  }
}
