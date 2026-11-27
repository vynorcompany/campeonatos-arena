import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/backend/services/management-session';
import { allowedFrontendOrigin } from '@/lib/backend/origin-policy';
import { readBoundedJson, RequestBodyTooLargeError } from '@/lib/http/json-body';
import { revokeDeviceInputSchema, arenaSettingsOutcomeSchema } from '@/lib/backend/contracts/arena-settings';
import { revokeDeviceSessionAction } from '@/lib/backend/services/devices-actions';
export const dynamic='force-dynamic';
export async function POST(request:NextRequest){const headers={'Cache-Control':'private, no-store',Vary:'Cookie'};if(!allowedFrontendOrigin(request.headers.get('origin'),process.env.VX4_FRONTEND_ORIGINS))return NextResponse.json({error:'Origem não autorizada.'},{status:403,headers});await requireAuth();let input;try{input=revokeDeviceInputSchema.parse(await readBoundedJson(request,4096));}catch(error){return NextResponse.json({error:'Sessão inválida.'},{status:error instanceof RequestBodyTooLargeError?413:400,headers});}const form=new FormData();form.set('sessionId',input.sessionId);try{return NextResponse.json(arenaSettingsOutcomeSchema.parse(await revokeDeviceSessionAction(form)),{headers});}catch{return NextResponse.json({error:'Não foi possível confirmar o encerramento. Confira seus dispositivos.'},{status:500,headers});}}
