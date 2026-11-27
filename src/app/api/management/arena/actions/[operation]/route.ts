import {NextRequest,NextResponse} from "next/server";
import {requireArenaAccess} from "@/lib/backend/services/management-session";
import {canPerformPermission} from "@/lib/permissions";
import {canManageAccess} from "@/lib/backend/contracts/arena-access";
import {configurationFields,configurationInputSchema,configurationFileFields,configurationFileLimit,configurationBodyLimit,type ConfigurationOperation} from "@/lib/backend/contracts/arena-configuration";
import {allowedFrontendOrigin} from "@/lib/backend/origin-policy";
import {readBoundedJson,RequestBodyTooLargeError} from "@/lib/http/json-body";
import {executeConfigurationMutation} from "@/lib/backend/services/arena-configuration-mutations";
export const dynamic='force-dynamic';
const known=new Set(['Aviso não encontrado.','Evento não encontrado.','A chave não existe ou já foi revogada.','Informe o título.','Informe o aviso.','Informe um link iniciado por http:// ou https://.','Envie uma imagem JPG, PNG ou WEBP.','A imagem deve ter no máximo 500 KB.','Não foi possível processar a imagem. Envie um JPG, PNG ou WEBP válido com até 24 megapixels.']);
export async function POST(request:NextRequest,context:{params:Promise<{operation:string}>}){
 const headers={'Cache-Control':'private, no-store',Vary:'Cookie'};if(!allowedFrontendOrigin(request.headers.get('origin'),process.env.VX4_FRONTEND_ORIGINS))return NextResponse.json({error:'Origem não autorizada.',success:null},{status:403,headers});
 const raw=(await context.params).operation;if(!Object.hasOwn(configurationFields,raw))return NextResponse.json({error:'Operação inválida.',success:null},{status:404,headers});const operation=raw as ConfigurationOperation;const auth=await requireArenaAccess();
 const allowed=operation.startsWith('agent-')?canManageAccess(auth):canPerformPermission(operation==='profile'?'arena:settings':'arena:portal',auth.arenaRole,auth.systemRole,auth.editPermissions);if(!allowed)return NextResponse.json({error:'Sem permissão para alterar esta seção.',success:null},{status:403,headers});
 let input;try{input=configurationInputSchema(operation).parse(await readBoundedJson(request,configurationBodyLimit(operation)));}catch(error){return NextResponse.json({error:'Dados inválidos ou arquivo acima do limite.',success:null},{status:error instanceof RequestBodyTooLargeError?413:400,headers});}
 const form=new FormData();for(const[key,values]of Object.entries(input.fields))for(const value of values)form.append(key,value);
 if(input.file){const bytes=Buffer.from(input.file.base64,'base64');if(bytes.toString('base64')!==input.file.base64||bytes.length>configurationFileLimit(operation))return NextResponse.json({error:'Arquivo inválido.',success:null},{status:400,headers});form.set(configurationFileFields[operation]!,new File([bytes],input.file.name,{type:input.file.type}));}
 try{return NextResponse.json(await executeConfigurationMutation(operation,form),{headers});}catch(error){const controlled=error instanceof Error&&known.has(error.message);return NextResponse.json({error:controlled?(error as Error).message:'Não foi possível confirmar a alteração. Confira os dados antes de tentar novamente.',success:null},{status:controlled?400:500,headers});}
}
