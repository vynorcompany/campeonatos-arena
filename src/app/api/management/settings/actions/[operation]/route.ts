import { NextRequest, NextResponse } from 'next/server';
import { requireArenaAccess } from '@/lib/backend/services/management-session';
import { canPerformPermission } from '@/lib/permissions';
import { allowedFrontendOrigin } from '@/lib/backend/origin-policy';
import { readBoundedJson, RequestBodyTooLargeError } from '@/lib/http/json-body';
import { arenaSettingsMutationFields, arenaSettingsInputSchema, arenaSettingsOutcomeSchema, type ArenaSettingsMutation } from '@/lib/backend/contracts/arena-settings';
import { savePrinterSettingsAction } from '@/lib/backend/services/printer-settings-actions';
import { saveCancellationPolicyAction } from '@/lib/backend/services/cancellation-policy-actions';
import { respondPrivacyRequestAction, releaseRetainedContactAction } from '@/lib/backend/services/privacy-management-actions';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest, context: {params:Promise<{operation:string}>}) {
 const headers={'Cache-Control':'private, no-store',Vary:'Cookie'};
 if(!allowedFrontendOrigin(request.headers.get('origin'),process.env.VX4_FRONTEND_ORIGINS))return NextResponse.json({error:'Origem não autorizada.'},{status:403,headers});
 const raw=(await context.params).operation;if(!Object.hasOwn(arenaSettingsMutationFields,raw))return NextResponse.json({error:'Operação inválida.'},{status:404,headers});
 const auth=await requireArenaAccess();if(!canPerformPermission('arena:settings',auth.arenaRole,auth.systemRole,auth.editPermissions))return NextResponse.json({error:'Sem permissão para alterar configurações.'},{status:403,headers});
 const operation=raw as ArenaSettingsMutation;let input;try{input=arenaSettingsInputSchema(operation).parse(await readBoundedJson(request,64*1024));}catch(error){return NextResponse.json({error:'Dados inválidos.'},{status:error instanceof RequestBodyTooLargeError?413:400,headers});}
 const form=new FormData();for(const[key,value]of Object.entries(input.fields))form.set(key,value);
 try{const result=operation==='printer'?await savePrinterSettingsAction(form):operation==='policies'?await saveCancellationPolicyAction(form):operation==='privacy-respond'?await respondPrivacyRequestAction(form):await releaseRetainedContactAction(form);return NextResponse.json(arenaSettingsOutcomeSchema.parse(result),{headers});}catch{return NextResponse.json({error:'Não foi possível confirmar a alteração. Confira os dados antes de tentar novamente.'},{status:500,headers});}
}
