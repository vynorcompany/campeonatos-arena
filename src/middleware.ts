import { NextResponse, type NextRequest } from "next/server";
import { contentSecurityPolicy } from "./lib/security/content-security-policy.mjs";

export function middleware(request: NextRequest) {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const policy = contentSecurityPolicy({ nonce, development: process.env.NODE_ENV === "development" });
  const requestHeaders = new Headers(request.headers);
  // Always overwrite untrusted incoming nonce/CSP headers before Next renders scripts.
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  // Nonced HTML must not be reused by a shared cache with a different policy.
  response.headers.set("Cache-Control", "private, no-cache, no-store, max-age=0, must-revalidate");
  return response;
}

export const config = {
  matcher: ["/((?!api/|_next/static/|_next/image/|media/|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|gif|svg|ico|css|js|woff2?|ttf|mp4|webm|pdf)$).*)"],
};
