import { NextRequest, NextResponse } from "next/server";
import { getPublicPlayerContext } from "@/lib/backend/services/player-session";
import { publicPlayerContextSchema } from "@/lib/backend/contracts/player-context";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const arena = request.nextUrl.searchParams.get("arena") ?? "";
  if (arena.length > 120 || (arena && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(arena))) {
    return NextResponse.json({ error: "Invalid arena" }, { status: 400 });
  }
  // Identity is always derived from the HttpOnly cookie, never a supplied player ID.
  const context = publicPlayerContextSchema.parse(await getPublicPlayerContext(arena));
  return NextResponse.json(context, { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
}
