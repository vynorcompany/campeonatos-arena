import { NextRequest, NextResponse } from "next/server";
import { resolveLoginBranding } from "@/lib/backend/services/login-branding";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Host is matched against the server's allowlist; it is never a fetch destination.
  const host = request.nextUrl.searchParams.get("host");
  if (host && host.length > 260) return NextResponse.json({ error: "Invalid host" }, { status: 400 });
  const branding = await resolveLoginBranding(host);
  return NextResponse.json(branding, { headers: { "Cache-Control": "no-store" } });
}
