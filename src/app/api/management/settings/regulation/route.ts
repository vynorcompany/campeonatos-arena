import { NextRequest,NextResponse } from 'next/server';
import { notFound } from 'next/navigation';
import { requireArenaAccess } from '@/lib/backend/services/management-session';
import { canPerformPermission } from '@/lib/permissions';
import { resolveRegulationHistory } from '@/lib/backend/services/regulation-data';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){const auth=await requireArenaAccess();if(!canPerformPermission('arena:settings',auth.arenaRole,auth.systemRole,auth.editPermissions))notFound();const headers={'Cache-Control':'private, no-store',Vary:'Cookie'};if(request.nextUrl.searchParams.size)return NextResponse.json({error:'Filtros inválidos.'},{status:400,headers});return NextResponse.json(await resolveRegulationHistory(auth.arenaId),{headers});}
