import { NextRequest, NextResponse } from "next/server";

const RATE_LIMIT = 100;
const WINDOW_MS = 60_000;

const hits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(id: string): { ok: boolean; reset: number } {
  const now = Date.now();
  let entry = hits.get(id);
  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + WINDOW_MS };
    hits.set(id, entry);
    return { ok: true, reset: entry.resetAt };
  }
  entry.count++;
  return { ok: entry.count <= RATE_LIMIT, reset: entry.resetAt };
}

if (typeof globalThis !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of hits) {
      if (now > val.resetAt) hits.delete(key);
    }
  }, WINDOW_MS);
}

const SKIP_RATE_LIMIT = [
  "/api/auth",
  "/api/v1/tracking/open",
  "/api/v1/tracking/click",
  "/api/v1/tracking/page",
];

function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-API-Key"
  );
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (req.method === "OPTIONS") {
    return addCorsHeaders(new NextResponse(null, { status: 204 }));
  }

  if (
    pathname.startsWith("/api/v1/") &&
    !SKIP_RATE_LIMIT.some((p) => pathname.startsWith(p))
  ) {
    const id =
      req.headers.get("x-api-key") ??
      req.headers.get("x-forwarded-for") ??
      "anon";
    const { ok, reset } = checkRateLimit(id);
    if (!ok) {
      return addCorsHeaders(
        NextResponse.json(
          { error: "Too many requests" },
          {
            status: 429,
            headers: {
              "Retry-After": String(
                Math.ceil((reset - Date.now()) / 1000)
              ),
            },
          }
        )
      );
    }
  }

  return addCorsHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/api/:path*"],
};
