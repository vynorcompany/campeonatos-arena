import { NextRequest, NextResponse } from "next/server";
import { requireArenaAccess } from "@/lib/auth/session";
import { getTvPresentationPayload } from "@/lib/services/tv-presentation";

import { createShortSnapshotCache } from "@/lib/short-snapshot-cache";
const snapshot = createShortSnapshotCache(10_000);

export async function GET(request: NextRequest) {
  const auth = await requireArenaAccess();
  const payload = await snapshot(auth.arenaId, () => getTvPresentationPayload(auth.arenaId));
  const headers = { "content-type": "application/json", "cache-control": "private, no-cache", etag: payload.etag };
  return request.headers.get("if-none-match") === payload.etag ? new NextResponse(null, { status: 304, headers }) : new NextResponse(payload.body, { headers });
}
