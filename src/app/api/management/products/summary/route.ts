import { NextRequest,NextResponse } from 'next/server';
import { requireModuleView } from '@/lib/auth/guards';
import { resolveStockSummary } from '@/lib/backend/services/stock-summary';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){const auth=await requireModuleView('stock');const headers={'Cache-Control':'private, no-store',Vary:'Cookie'};if(request.nextUrl.searchParams.size)return NextResponse.json({error:'Filtros inválidos.'},{status:400,headers});return NextResponse.json(await resolveStockSummary(auth.arenaId),{headers});}
