import { NextRequest, NextResponse } from "next/server";
import { requireArenaAccess } from "@/lib/backend/services/management-session";
import { resolveAssistantHistory } from "@/lib/backend/services/assistant-history";
export const dynamic = "force-dynamic";
export async function GET(request:NextRequest) {
  const auth = await requireArenaAccess();
  const headers = {"Cache-Control":"private, no-store",Vary:"Cookie"};
  if (!["SUPER_ADMIN","ADMIN"].includes(auth.systemRole) && !["ADMIN","OWNER"].includes(auth.arenaRole??"")) return NextResponse.json({error:"Sem permissão para acessar o assistente."},{status:403,headers});
  if ([...request.nextUrl.searchParams].length) return NextResponse.json({error:"Filtros inválidos."},{status:400,headers});
  return NextResponse.json(await resolveAssistantHistory(auth.arenaId,auth.userId),{headers});
}
