import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

let cachedScript: string | null = null;

function getScript(): string {
  if (cachedScript) return cachedScript;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const templatePath = join(process.cwd(), "src/lib/tracking/tracker.js");
  const template = readFileSync(templatePath, "utf-8");

  cachedScript = template.replace("{{baseUrl}}", baseUrl);
  return cachedScript;
}

export async function GET() {
  const script = getScript();

  return new NextResponse(script, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
