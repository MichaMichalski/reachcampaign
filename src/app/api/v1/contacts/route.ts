import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

const createContactSchema = z.object({
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const url = req.nextUrl;
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
    const perPage = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("perPage") ?? "20"))
    );
    const search = url.searchParams.get("search") ?? "";
    const tag = url.searchParams.get("tag");
    const sortBy = url.searchParams.get("sortBy") ?? "createdAt";
    const sortOrder =
      url.searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ];
    }

    if (tag) {
      where.tags = { some: { tag: { name: tag } } };
    }

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        include: { tags: { include: { tag: true } } },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.contact.count({ where }),
    ]);

    return jsonResponse({
      data: contacts,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    });
  } catch {
    return errorResponse("Failed to fetch contacts", 500);
  }
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const body = await req.json();
    const parsed = createContactSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const { tags, ...data } = parsed.data;

    const existing = await prisma.contact.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      return errorResponse("A contact with this email already exists", 409);
    }

    const contact = await prisma.contact.create({
      data: {
        ...data,
        customFields: (data.customFields ?? {}) as Prisma.InputJsonValue,
        ...(tags?.length && {
          tags: {
            create: tags.map((tagId) => ({ tagId })),
          },
        }),
      },
      include: { tags: { include: { tag: true } } },
    });

    return jsonResponse(contact, 201);
  } catch {
    return errorResponse("Failed to create contact", 500);
  }
}
