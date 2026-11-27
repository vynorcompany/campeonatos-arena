import { NextRequest,NextResponse } from 'next/server';
import { resolvePublicRegulation } from '@/lib/backend/services/regulation-data';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest,context:{params:Promise<{slug:string}>}){const headers={'Cache-Control':'private, no-store',Vary:'Cookie'};const{slug}=await context.params;if(!slug||slug.length>200||request.nextUrl.searchParams.size)return NextResponse.json(null,{status:400,headers});return NextResponse.json(await resolvePublicRegulation(slug),{headers});}
