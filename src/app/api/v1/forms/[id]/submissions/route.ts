import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";
import { paginationMeta } from "@/lib/utils";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const { id } = await params;

    const form = await prisma.form.findUnique({ where: { id } });
    if (!form) return errorResponse("Form not found", 404);

    const url = req.nextUrl;
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("perPage") || "25")));
    const skip = (page - 1) * perPage;

    const [submissions, total] = await Promise.all([
      prisma.formSubmission.findMany({
        where: { formId: id },
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
        include: {
          contact: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      }),
      prisma.formSubmission.count({ where: { formId: id } }),
    ]);

    return jsonResponse({
      data: submissions,
      pagination: paginationMeta(total, page, perPage),
    });
  } catch {
    return errorResponse("Failed to fetch submissions", 500);
  }
}
