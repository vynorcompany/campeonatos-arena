import { NextResponse } from "next/server";
import { requireArenaAccess } from "@/lib/auth/session";
import { getTvPresentationPayload } from "@/lib/services/tv-presentation";

export async function GET() {
  const auth = await requireArenaAccess();
  const payload = await getTvPresentationPayload(auth.arenaId);

  return NextResponse.json(payload);
}
