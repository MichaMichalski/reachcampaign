import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

const updateContactSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
  score: z.number().int().optional(),
  doNotContact: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;

    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        tags: { include: { tag: true } },
        notes: { orderBy: { createdAt: "desc" }, take: 10 },
        trackingEvents: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });

    if (!contact) {
      return errorResponse("Contact not found", 404);
    }

    return jsonResponse(contact);
  } catch {
    return errorResponse("Failed to fetch contact", 500);
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = updateContactSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const existing = await prisma.contact.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Contact not found", 404);
    }

    const { tags, ...data } = parsed.data;

    if (data.email && data.email !== existing.email) {
      const duplicate = await prisma.contact.findUnique({
        where: { email: data.email },
      });
      if (duplicate) {
        return errorResponse("A contact with this email already exists", 409);
      }
    }

    if (tags) {
      await prisma.contactTag.deleteMany({ where: { contactId: id } });
      if (tags.length) {
        await prisma.contactTag.createMany({
          data: tags.map((tagId) => ({ contactId: id, tagId })),
        });
      }
    }

    const { customFields, ...rest } = data;
    const contact = await prisma.contact.update({
      where: { id },
      data: {
        ...rest,
        ...(customFields !== undefined && {
          customFields: customFields as Prisma.InputJsonValue,
        }),
      },
      include: { tags: { include: { tag: true } } },
    });

    return jsonResponse(contact);
  } catch {
    return errorResponse("Failed to update contact", 500);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;

    const existing = await prisma.contact.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Contact not found", 404);
    }

    await prisma.contact.delete({ where: { id } });

    return jsonResponse({ message: "Contact deleted" });
  } catch {
    return errorResponse("Failed to delete contact", 500);
  }
}
