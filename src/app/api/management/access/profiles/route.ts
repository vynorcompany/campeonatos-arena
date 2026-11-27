import { NextRequest,NextResponse } from "next/server";
import { requireArenaAccess } from "@/lib/backend/services/management-session";
import { canManageAccess } from "@/lib/backend/contracts/arena-access";
import { resolveAccessProfiles } from "@/lib/backend/services/arena-access-data";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest) {
 const auth=await requireArenaAccess();const headers={"Cache-Control":"private, no-store",Vary:"Cookie"};
 if(!canManageAccess(auth))return NextResponse.json({error:"Sem permissão para gerenciar acessos."},{status:403,headers});
 const params=request.nextUrl.searchParams;const q=params.get('q')??'';
 if([...params].length)return NextResponse.json({error:"Filtros inválidos."},{status:400,headers});
 return NextResponse.json(await resolveAccessProfiles(auth.arenaId),{headers});
}
