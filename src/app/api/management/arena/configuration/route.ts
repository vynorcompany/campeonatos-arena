import {NextRequest,NextResponse} from "next/server";
import {requireArenaAccess} from "@/lib/backend/services/management-session";
import {canPerformPermission,canViewModule} from "@/lib/permissions";
import {canManageAccess} from "@/lib/backend/contracts/arena-access";
import {configurationSections,type ConfigurationSection} from "@/lib/backend/contracts/arena-configuration";
import {resolveArenaConfiguration} from "@/lib/backend/services/arena-configuration-data";
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){const auth=await requireArenaAccess();const headers={'Cache-Control':'private, no-store',Vary:'Cookie'};const params=request.nextUrl.searchParams;const section=params.get('section')??'data';
 if(!configurationSections.includes(section as ConfigurationSection)||[...params.keys()].some(key=>key!=='section')||params.getAll('section').length>1)return NextResponse.json({error:'Seção inválida.'},{status:400,headers});
 const allowed=canViewModule('arena',auth.arenaRole,auth.systemRole,auth.viewPermissions)&&(['users','profiles','integrations'].includes(section)?canManageAccess(auth):canPerformPermission(section==='portal'?'arena:portal':'arena:settings',auth.arenaRole,auth.systemRole,auth.viewPermissions));
 if(!allowed)return NextResponse.json({error:'Sem permissão para consultar esta seção.'},{status:403,headers});
 return NextResponse.json(await resolveArenaConfiguration(auth.arenaId,section as ConfigurationSection),{headers});
}
