import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

const updateTagSchema = z.object({
  name: z.string().min(1).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color").optional(),
});

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateTagSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const existing = await prisma.tag.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Tag not found", 404);
    }

    if (parsed.data.name && parsed.data.name !== existing.name) {
      const duplicate = await prisma.tag.findUnique({
        where: { name: parsed.data.name },
      });
      if (duplicate) {
        return errorResponse("A tag with this name already exists", 409);
      }
    }

    const tag = await prisma.tag.update({
      where: { id },
      data: parsed.data,
    });

    return jsonResponse(tag);
  } catch {
    return errorResponse("Failed to update tag", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;

    const existing = await prisma.tag.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Tag not found", 404);
    }

    await prisma.tag.delete({ where: { id } });

    return jsonResponse({ message: "Tag deleted" });
  } catch {
    return errorResponse("Failed to delete tag", 500);
  }
}
