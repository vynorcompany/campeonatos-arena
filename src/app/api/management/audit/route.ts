import { NextRequest,NextResponse } from 'next/server';
import { requireArenaAccess } from '@/lib/backend/services/management-session';
import { auditWorkspaceQuerySchema } from '@/lib/backend/contracts/audit-workspace';
import { resolveAuditWorkspace } from '@/lib/backend/services/audit-workspace';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){const auth=await requireArenaAccess();const headers={'Cache-Control':'private, no-store',Vary:'Cookie'};if(!['SUPER_ADMIN','ADMIN'].includes(auth.systemRole)&&!['ADMIN','OWNER'].includes(auth.arenaRole??''))return NextResponse.json({error:'Sem permissão para consultar a auditoria.'},{status:403,headers});const params=request.nextUrl.searchParams;const parsed=auditWorkspaceQuerySchema.safeParse(Object.fromEntries(params));if(!parsed.success||[...new Set(params.keys())].some(key=>params.getAll(key).length>1))return NextResponse.json({error:'Filtros inválidos.'},{status:400,headers});const global=parsed.data.scope==='system'&&['SUPER_ADMIN','ADMIN'].includes(auth.systemRole);return NextResponse.json(await resolveAuditWorkspace(auth.arenaId,global,parsed.data),{headers});}
