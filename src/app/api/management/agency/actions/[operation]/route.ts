import {NextRequest,NextResponse} from "next/server";
import {requireAuth,requireArenaAccess} from "@/lib/backend/services/management-session";
import {canManageAccess} from "@/lib/backend/contracts/arena-access";
import {agencyFields,agencyInputSchema,isAgencySystemRole,type AgencyOperation} from "@/lib/backend/contracts/agency-mutations";
import {allowedFrontendOrigin} from "@/lib/backend/origin-policy";
import {readBoundedJson,RequestBodyTooLargeError} from "@/lib/http/json-body";
import {executeAgencyMutation} from "@/lib/backend/services/agency-mutations";
export const dynamic='force-dynamic';
const known=new Set(['Arena inválida.','Arena não encontrada.','Usuário não encontrado.','Conecte esta arena primeiro.','Somente o proprietário da plataforma pode alterar acessos de agência.','Você não pode remover seu próprio acesso de proprietário da plataforma.','A plataforma precisa manter pelo menos um proprietário.','Informe o nome da arena.','Informe um e-mail válido.']);
export async function POST(request:NextRequest,context:{params:Promise<{operation:string}>}){
 const headers={'Cache-Control':'private, no-store',Vary:'Cookie'};
 if(!allowedFrontendOrigin(request.headers.get('origin'),process.env.VX4_FRONTEND_ORIGINS))return NextResponse.json({error:'Origem não autorizada.'},{status:403,headers});
 const raw=(await context.params).operation;if(!Object.hasOwn(agencyFields,raw))return NextResponse.json({error:'Operação inválida.'},{status:404,headers});const operation=raw as AgencyOperation;const auth=await requireAuth();
 if(!operation.startsWith('whatsapp-')&&(!isAgencySystemRole(auth.systemRole)||operation==='system-role'&&auth.systemRole!=='SUPER_ADMIN'))return NextResponse.json({error:'Sem permissão para executar esta ação.'},{status:403,headers});
 let input;try{input=agencyInputSchema(operation).parse(await readBoundedJson(request,32*1024));}catch(error){return NextResponse.json({error:'Dados inválidos.'},{status:error instanceof RequestBodyTooLargeError?413:400,headers});}
 if(operation.startsWith('whatsapp-')){const arena=await requireArenaAccess();if(!canManageAccess(arena)||(arena.arenaId!==input.arenaId&&!['SUPER_ADMIN','ADMIN'].includes(arena.systemRole)))return NextResponse.json({error:'Sem permissão para configurar o WhatsApp desta arena.'},{status:403,headers});}
 try{return NextResponse.json(await executeAgencyMutation(operation,input),{headers});}catch(error){const controlled=error instanceof Error&&known.has(error.message);return NextResponse.json({error:controlled?(error as Error).message:'Não foi possível confirmar a alteração. Confira os dados antes de tentar novamente.'},{status:controlled?400:500,headers});}
}
