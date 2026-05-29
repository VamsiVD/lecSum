import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// ── Rate limiting ────────────────────────────────────────────────────────────
// In-memory sliding window per IP. Resets on cold start (acceptable trade-off
// for a simple middleware-only approach with no external store).

const LIMITS: Record<string, { max: number; windowMs: number }> = {
  "/api/extract":    { max: 5,  windowMs: 60_000 }, // 5 / min  — Bedrock + S3
  "/api/summary":    { max: 10, windowMs: 60_000 }, // 10 / min — Bedrock
  "/api/quiz":       { max: 10, windowMs: 60_000 },
  "/api/flashcards": { max: 10, windowMs: 60_000 },
  "/api/upload-url": { max: 10, windowMs: 60_000 }, // 10 / min — S3 presign
};

const hits = new Map<string, number[]>();

function isRateLimited(ip: string, path: string): boolean {
  const cfg = LIMITS[path];
  if (!cfg) return false;

  const key = `${ip}:${path}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter(t => now - t < cfg.windowMs);

  if (recent.length >= cfg.max) return true;

  recent.push(now);
  hits.set(key, recent);
  return false;
}

function getIp(req: Request): string {
  return (
    (req.headers as Headers).get("x-forwarded-for")?.split(",")[0].trim() ??
    (req.headers as Headers).get("x-real-ip") ??
    "unknown"
  );
}

// ── Auth ─────────────────────────────────────────────────────────────────────

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const ip = getIp(req);
  const path = req.nextUrl.pathname;

  if (isRateLimited(ip, path)) {
    return new NextResponse(
      JSON.stringify({ error: "Too many requests. Slow down." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      }
    );
  }

  const { userId } = await auth();
  const url = req.nextUrl;

  if (url.pathname === "/") {
    return userId
      ? NextResponse.redirect(new URL("/dashboard", req.url))
      : NextResponse.redirect(new URL("/sign-in", req.url));
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)).*)",
    "/(api|trpc)(.*)",
  ],
};
