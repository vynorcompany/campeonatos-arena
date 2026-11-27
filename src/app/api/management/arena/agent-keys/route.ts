import {NextRequest,NextResponse} from "next/server";
import {requireArenaAccess} from "@/lib/backend/services/management-session";
import {canManageAccess} from "@/lib/backend/contracts/arena-access";
import {resolveAgentKeys} from "@/lib/backend/services/arena-configuration-data";
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){const auth=await requireArenaAccess();const headers={'Cache-Control':'private, no-store',Vary:'Cookie'};if(!canManageAccess(auth))return NextResponse.json({error:'Sem permissão para gerenciar chaves.'},{status:403,headers});if([...request.nextUrl.searchParams].length)return NextResponse.json({error:'Filtros inválidos.'},{status:400,headers});return NextResponse.json(await resolveAgentKeys(auth.arenaId),{headers});}
