import {NextRequest,NextResponse} from "next/server";
import {requireArenaAccess} from "@/lib/backend/services/management-session";
import {canManageAccess} from "@/lib/backend/contracts/arena-access";
import {resolveAccessProfile} from "@/lib/backend/services/arena-access-data";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest,context:{params:Promise<{profileId:string}>}) {
 const auth=await requireArenaAccess();const headers={"Cache-Control":"private, no-store",Vary:"Cookie"};
 if(!canManageAccess(auth))return NextResponse.json({error:"Sem permissão para gerenciar acessos."},{status:403,headers});
 const {profileId}=await context.params;
 if(!profileId||profileId.length>200||[...request.nextUrl.searchParams].length)return NextResponse.json({error:"Perfil inválido."},{status:400,headers});
 return NextResponse.json(await resolveAccessProfile(auth.arenaId,profileId),{headers});
}
