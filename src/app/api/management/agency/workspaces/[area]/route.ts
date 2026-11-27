import {NextRequest,NextResponse} from "next/server";
import {requireAuth} from "@/lib/backend/services/management-session";
import {isAgencySystemRole} from "@/lib/backend/contracts/agency-mutations";
import {resolveAgencyUsers,resolveAgencyArenas} from "@/lib/backend/services/agency-workspaces";
export const dynamic='force-dynamic';
export async function GET(request:NextRequest,context:{params:Promise<{area:string}>}){const auth=await requireAuth();const headers={'Cache-Control':'private, no-store',Vary:'Cookie'};if(!isAgencySystemRole(auth.systemRole))return NextResponse.json({error:'Sem permissão para acessar a agência.'},{status:403,headers});const area=(await context.params).area;if(!['users','arenas'].includes(area))return NextResponse.json({error:'Seção inválida.'},{status:404,headers});if([...request.nextUrl.searchParams.keys()].length)return NextResponse.json({error:'Parâmetros inválidos.'},{status:400,headers});return NextResponse.json(area==='users'?await resolveAgencyUsers():await resolveAgencyArenas(),{headers});}
