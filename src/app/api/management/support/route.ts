import { NextRequest, NextResponse } from "next/server";
import { requireArenaAccess } from "@/lib/backend/services/management-session";
import { resolveSupportWorkspace } from "@/lib/backend/services/support-workspace";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const auth = await requireArenaAccess();
  const headers = {"Cache-Control":"private, no-store",Vary:"Cookie"};
  if ([...request.nextUrl.searchParams].length) return NextResponse.json({error:"Filtros inválidos."},{status:400,headers});
  return NextResponse.json(await resolveSupportWorkspace(auth.arenaId),{headers});
}
