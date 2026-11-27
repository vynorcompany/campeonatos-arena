import { NextRequest, NextResponse } from "next/server";
import { requireArenaAccess } from "@/lib/backend/services/management-session";
import { resolveManagementShell } from "@/lib/backend/services/management-shell";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const auth = await requireArenaAccess();
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  if (request.nextUrl.search) return NextResponse.json({ error: 'Invalid shell parameters' }, { status: 400, headers });
  return NextResponse.json(await resolveManagementShell(auth), { headers });
}
