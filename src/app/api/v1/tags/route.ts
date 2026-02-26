import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

const createTagSchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color").optional(),
});

export async function GET(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const tags = await prisma.tag.findMany({
      include: { _count: { select: { contacts: true } } },
      orderBy: { name: "asc" },
    });

    return jsonResponse(tags);
  } catch {
    return errorResponse("Failed to fetch tags", 500);
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const body = await req.json();
    const parsed = createTagSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const existing = await prisma.tag.findUnique({
      where: { name: parsed.data.name },
    });
    if (existing) {
      return errorResponse("A tag with this name already exists", 409);
    }

    const tag = await prisma.tag.create({ data: parsed.data });

    return jsonResponse(tag, 201);
  } catch {
    return errorResponse("Failed to create tag", 500);
  }
}
