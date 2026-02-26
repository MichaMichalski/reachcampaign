import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import Handlebars from "handlebars";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const template = await prisma.emailTemplate.findUnique({ where: { id } });
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    let html = template.htmlContent;

    const contactId = req.nextUrl.searchParams.get("contactId");
    if (contactId) {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
      });
      if (contact) {
        const compiled = Handlebars.compile(html);
        html = compiled({
          firstName: contact.firstName || "",
          lastName: contact.lastName || "",
          email: contact.email,
          company: contact.company || "",
        });
      }
    }

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to render preview" },
      { status: 500 }
    );
  }
}
