import { NextRequest,NextResponse } from 'next/server';
import { requireArenaAccess } from '@/lib/backend/services/management-session';
import { canPerformPermission } from '@/lib/permissions';
import { allowedFrontendOrigin } from '@/lib/backend/origin-policy';
import { readBoundedJson,RequestBodyTooLargeError } from '@/lib/http/json-body';
import { regulationCreateInputSchema,regulationOutcomeSchema } from '@/lib/backend/contracts/regulation';
import { createRegulationDocumentAction } from '@/lib/backend/services/regulation-actions';
export const dynamic='force-dynamic';
export async function POST(request:NextRequest){const headers={'Cache-Control':'private, no-store',Vary:'Cookie'};if(!allowedFrontendOrigin(request.headers.get('origin'),process.env.VX4_FRONTEND_ORIGINS))return NextResponse.json({error:'Origem não autorizada.',success:null},{status:403,headers});const auth=await requireArenaAccess();if(!canPerformPermission('arena:settings',auth.arenaRole,auth.systemRole,auth.editPermissions))return NextResponse.json({error:'Sem permissão para publicar regulamentos.',success:null},{status:403,headers});let input;try{input=regulationCreateInputSchema.parse(await readBoundedJson(request,128*1024));}catch(error){return NextResponse.json({error:'Regulamento inválido.',success:null},{status:error instanceof RequestBodyTooLargeError?413:400,headers});}const form=new FormData();form.set('content',input.content);try{return NextResponse.json(regulationOutcomeSchema.parse(await createRegulationDocumentAction({error:null,success:null},form)),{headers});}catch{return NextResponse.json({error:'Não foi possível confirmar a publicação. Confira as versões antes de tentar novamente.',success:null},{status:500,headers});}}
