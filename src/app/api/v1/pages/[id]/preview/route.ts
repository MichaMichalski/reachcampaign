import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const page = await prisma.landingPage.findUnique({ where: { id } });
    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return new NextResponse(page.htmlContent, {
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
