import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

const createPageSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  designJson: z.record(z.string(), z.unknown()).default({}),
  htmlContent: z.string().default(""),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  ogImage: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const pages = await prisma.landingPage.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return jsonResponse(pages);
  } catch {
    return errorResponse("Failed to fetch landing pages", 500);
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const body = await req.json();
    const parsed = createPageSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const existing = await prisma.landingPage.findUnique({
      where: { slug: parsed.data.slug },
    });
    if (existing) {
      return errorResponse("A page with this slug already exists");
    }

    const page = await prisma.landingPage.create({
      data: {
        ...parsed.data,
        designJson: parsed.data.designJson as Prisma.InputJsonValue,
      },
    });

    return jsonResponse(page, 201);
  } catch {
    return errorResponse("Failed to create landing page", 500);
  }
}
