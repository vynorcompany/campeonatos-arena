import { NextRequest, NextResponse } from 'next/server';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requireArenaAccess } from '@/lib/backend/services/management-session';
import { canPerformPermission } from '@/lib/permissions';
import { arenaSettingsAreas } from '@/lib/backend/contracts/arena-settings';
import { resolvePrinterSettings, resolvePolicySettings, resolvePrivacySettings } from '@/lib/backend/services/arena-settings';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest, context: { params: Promise<{area:string}> }) {
 const auth = await requireArenaAccess(); if (!canPerformPermission('arena:settings',auth.arenaRole,auth.systemRole,auth.editPermissions)) notFound();
 const headers = {'Cache-Control':'private, no-store',Vary:'Cookie'}; const area = arenaSettingsAreas.safeParse((await context.params).area); if (!area.success) return NextResponse.json({error:'Configuração inválida.'},{status:404,headers});
 const query = (area.data==='privacy'?z.object({q:z.string().max(100).default('')}).strict():z.object({}).strict()).safeParse(Object.fromEntries(request.nextUrl.searchParams));
 if(!query.success||request.nextUrl.searchParams.getAll('q').length>1)return NextResponse.json({error:'Filtros inválidos.'},{status:400,headers});
 const data = area.data==='printer'?await resolvePrinterSettings(auth.arenaId):area.data==='policies'?await resolvePolicySettings(auth.arenaId):await resolvePrivacySettings(auth.arenaId,'q' in query.data?String(query.data.q):'');
 return NextResponse.json(data,{headers});
}
