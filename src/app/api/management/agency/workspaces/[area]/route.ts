import {NextRequest,NextResponse} from "next/server";
import {requireAuth} from "@/lib/backend/services/management-session";
import {isAgencySystemRole} from "@/lib/backend/contracts/agency-mutations";
import {resolveAgencyUsers,resolveAgencyArenas} from "@/lib/backend/services/agency-workspaces";
import { agencyPageSchemas, type AgencyPageView } from "@/lib/backend/contracts/agency-pages";
import { resolveAgencyMetrics, resolveAgencyRecentTickets, resolveAgencyTicketHistory, resolveAgencyPlansPage, resolveAgencyConnectionsPage } from "@/lib/backend/services/agency-pages";
const pages = { metrics: resolveAgencyMetrics, tickets: resolveAgencyRecentTickets, history: resolveAgencyTicketHistory, plans: resolveAgencyPlansPage, connections: resolveAgencyConnectionsPage };
export const dynamic='force-dynamic';
export async function GET(request:NextRequest,context:{params:Promise<{area:string}>}){const auth=await requireAuth();const headers={'Cache-Control':'private, no-store',Vary:'Cookie'};if(!isAgencySystemRole(auth.systemRole))return NextResponse.json({error:'Sem permissão para acessar a agência.'},{status:403,headers});const area=(await context.params).area;if(!['users','arenas'].includes(area)&&!Object.hasOwn(agencyPageSchemas,area))return NextResponse.json({error:'Seção inválida.'},{status:404,headers});if([...request.nextUrl.searchParams.keys()].length)return NextResponse.json({error:'Parâmetros inválidos.'},{status:400,headers});try{return NextResponse.json(area==='users'?await resolveAgencyUsers():area==='arenas'?await resolveAgencyArenas():await pages[area as AgencyPageView](),{headers});}catch{return NextResponse.json({error:'Não foi possível consultar a agência.'},{status:503,headers});}}
