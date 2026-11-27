import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, getArenaAccessDecision } from "@/lib/backend/services/management-session";
import { managementContextResponseSchema } from "@/lib/backend/contracts/management-context";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  const access = request.nextUrl.searchParams.get('access');
  if (access !== null && access !== 'arena') return NextResponse.json({ error: 'Invalid access mode' }, { status: 400, headers });
  const result = access === 'arena' ? await getArenaAccessDecision() : { auth: await getAuthContext(), redirectTo: null };
  return NextResponse.json(managementContextResponseSchema.parse(result), { headers });
}
