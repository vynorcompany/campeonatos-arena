import {NextRequest,NextResponse} from "next/server";
import {requireArenaAccess} from "@/lib/backend/services/management-session";
import {canViewModule,canPerformPermission} from "@/lib/permissions";
import {resolveCourtConfiguration} from "@/lib/backend/services/court-settings-data";
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){const auth=await requireArenaAccess();const headers={'Cache-Control':'private, no-store',Vary:'Cookie'};if(!canViewModule('calendar',auth.arenaRole,auth.systemRole,auth.viewPermissions)||!canPerformPermission('calendar:settings:manage',auth.arenaRole,auth.systemRole,auth.editPermissions))return NextResponse.json({error:'Sem permissão para configurar quadras.'},{status:403,headers});if([...request.nextUrl.searchParams.keys()].length)return NextResponse.json({error:'Parâmetros inválidos.'},{status:400,headers});return NextResponse.json(await resolveCourtConfiguration(auth.arenaId),{headers});}
