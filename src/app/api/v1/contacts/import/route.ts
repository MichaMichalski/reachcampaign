import { NextRequest } from "next/server";
import { parse } from "csv-parse/sync";
import { prisma } from "@/lib/db";
import { authenticateApi, jsonResponse, errorResponse } from "@/lib/api-auth";

const COLUMN_MAP: Record<string, string> = {
  email: "email",
  first_name: "firstName",
  firstname: "firstName",
  last_name: "lastName",
  lastname: "lastName",
  phone: "phone",
  company: "company",
  title: "title",
};

function normalizeHeader(header: string): string {
  const key = header.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return COLUMN_MAP[key] ?? key;
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateApi(req);
  if ("error" in authResult) return authResult.error;

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return errorResponse("CSV file is required");
    }

    const text = await file.text();
    const records = parse(text, {
      columns: (headers: string[]) => headers.map(normalizeHeader),
      skip_empty_lines: true,
      trim: true,
    }) as Record<string, string>[];

    const existingEmails = new Set(
      (await prisma.contact.findMany({ select: { email: true } })).map(
        (c) => c.email.toLowerCase()
      )
    );

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 2; // 1-indexed + header row

      if (!row.email) {
        errors.push(`Row ${rowNum}: missing email`);
        skipped++;
        continue;
      }

      const email = row.email.trim().toLowerCase();
      if (existingEmails.has(email)) {
        skipped++;
        continue;
      }

      try {
        await prisma.contact.create({
          data: {
            email,
            firstName: row.firstName || null,
            lastName: row.lastName || null,
            phone: row.phone || null,
            company: row.company || null,
            title: row.title || null,
          },
        });
        existingEmails.add(email);
        imported++;
      } catch {
        errors.push(`Row ${rowNum}: failed to import ${email}`);
        skipped++;
      }
    }

    return jsonResponse({ imported, skipped, errors });
  } catch {
    return errorResponse("Failed to import contacts", 500);
  }
}
