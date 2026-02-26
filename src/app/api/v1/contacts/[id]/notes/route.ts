import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

const createNoteSchema = z.object({
  content: z.string().min(1, "Content is required"),
});

export async function GET(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;

    const contact = await prisma.contact.findUnique({ where: { id } });
    if (!contact) {
      return errorResponse("Contact not found", 404);
    }

    const notes = await prisma.contactNote.findMany({
      where: { contactId: id },
      orderBy: { createdAt: "desc" },
    });

    return jsonResponse(notes);
  } catch {
    return errorResponse("Failed to fetch notes", 500);
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = createNoteSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        parsed.error.issues.map((i) => i.message).join(", ")
      );
    }

    const contact = await prisma.contact.findUnique({ where: { id } });
    if (!contact) {
      return errorResponse("Contact not found", 404);
    }

    const note = await prisma.contactNote.create({
      data: {
        contactId: id,
        content: parsed.data.content,
      },
    });

    return jsonResponse(note, 201);
  } catch {
    return errorResponse("Failed to create note", 500);
  }
}
