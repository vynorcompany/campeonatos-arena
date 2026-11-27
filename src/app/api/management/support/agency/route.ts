import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/backend/services/management-session";
import { resolveAgencySupportWorkspace } from "@/lib/backend/services/support-workspace";
export const dynamic = "force-dynamic";
export async function GET(request:NextRequest) {
  const auth = await requireAuth();
  const headers = {"Cache-Control":"private, no-store",Vary:"Cookie"};
  if (!["SUPER_ADMIN","ADMIN","MANAGER"].includes(auth.systemRole)) return NextResponse.json({error:"Sem permissão para consultar chamados da agência."},{status:403,headers});
  if ([...request.nextUrl.searchParams].length) return NextResponse.json({error:"Filtros inválidos."},{status:400,headers});
  return NextResponse.json(await resolveAgencySupportWorkspace(),{headers});
}
