import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { consumeRateLimit } from "@/features/security/rate-limit";
import { isTrustedMutation, requestClientKey } from "@/features/security/request";

const maxRequestBytes = 11 * 1024 * 1024;

export function proxy(request: NextRequest) {
  if (!isTrustedMutation(request)) return NextResponse.json({ error: "Cross-site request rejected" }, { status: 403 });
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxRequestBytes) {
    return NextResponse.json({ error: "Request body is too large" }, { status: 413 });
  }
  if (request.nextUrl.pathname.startsWith("/api/auth/") && request.method === "POST") { const strict = request.nextUrl.pathname === "/api/auth/login" || request.nextUrl.pathname.includes("password-reset"); const rate = consumeRateLimit(`${requestClientKey(request)}:${request.nextUrl.pathname}`, strict ? 10 : 20, 15 * 60_000); if (!rate.allowed) return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429, headers: { "Retry-After": String(Math.ceil((rate.resetAt - Date.now()) / 1000)) } }); }

  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  if (process.env.APP_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
