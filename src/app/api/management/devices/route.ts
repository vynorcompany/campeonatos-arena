import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireAuth } from '@/lib/backend/services/management-session';
import { resolveDeviceSessions } from '@/lib/backend/services/device-sessions';
import { env } from '@/lib/env';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){const auth=await requireAuth();const headers={'Cache-Control':'private, no-store',Vary:'Cookie'};if(request.nextUrl.searchParams.size)return NextResponse.json({error:'Filtros inválidos.'},{status:400,headers});return NextResponse.json(await resolveDeviceSessions(auth.userId,(await cookies()).get(env.sessionCookieName)?.value),{headers});}
