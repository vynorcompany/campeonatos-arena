import {NextRequest,NextResponse} from "next/server";
import {requireAuth,requireArenaAccess} from "@/lib/backend/services/management-session";
import {allowedFrontendOrigin} from "@/lib/backend/origin-policy";
import {readBoundedJson,RequestBodyTooLargeError} from "@/lib/http/json-body";
import {userOperations,userInputSchema,userOutcomeSchema,type UserOperation} from "@/lib/backend/contracts/user-mutations";
import {canManageAccess} from "@/lib/backend/contracts/arena-access";
import {updateArenaUserRoleAction,updateArenaUserAction,removeArenaUserAction,updateOwnProfileAction,updateOwnPasswordAction} from "@/lib/backend/services/user-actions";
export const dynamic='force-dynamic';
const businessErrors=new Set(['Este usuário participa de outras arenas. Os dados pessoais devem ser alterados pela própria conta.','Você não tem permissão para gerenciar usuários.','Altere seu próprio papel por outro owner para evitar perda de acesso.','Usuário não encontrado nesta arena.','Somente um owner pode alterar acessos de owner.','A arena precisa manter pelo menos um owner.','Perfil de usuário inválido ou inativo.','Este e-mail já está em uso por outro usuário.','Você não pode remover o próprio acesso por aqui.','Somente um owner pode remover outro owner.','Informe nome e sobrenome.','Informe um e-mail válido.','Usuário inválido.']);
export async function POST(request:NextRequest,context:{params:Promise<{operation:string}>}) {
 const headers={'Cache-Control':'private, no-store',Vary:'Cookie'};
 if(!allowedFrontendOrigin(request.headers.get('origin'),process.env.VX4_FRONTEND_ORIGINS))return NextResponse.json({error:'Origem não autorizada.',success:null},{status:403,headers});
 const raw=(await context.params).operation;if(!userOperations.includes(raw as UserOperation))return NextResponse.json({error:'Operação inválida.',success:null},{status:404,headers});
 const operation=raw as UserOperation;
 if(operation==='own-profile'||operation==='own-password')await requireAuth();
 else if(!canManageAccess(await requireArenaAccess()))return NextResponse.json({error:'Você não tem permissão para gerenciar usuários.',success:null},{status:403,headers});
 let payload;try{payload=userInputSchema(operation).parse(await readBoundedJson(request,256*1024));}catch(error){return NextResponse.json({error:'Dados inválidos.',success:null},{status:error instanceof RequestBodyTooLargeError?413:400,headers});}
 const form=new FormData();for(const[key,value]of Object.entries(payload)){if(Array.isArray(value))for(const item of value)form.append(key,item);else form.set(key,value);}
 try{
  let result={error:null,success:null} as {error:string|null;success:string|null};
  if(operation==='role')await updateArenaUserRoleAction(form);
  else if(operation==='update')await updateArenaUserAction(form);
  else if(operation==='remove')await removeArenaUserAction(form);
  else result=operation==='own-profile'?await updateOwnProfileAction(result,form):await updateOwnPasswordAction(result,form);
  return NextResponse.json(userOutcomeSchema.parse(result),{headers});
 }catch(error){const known=error instanceof Error&&businessErrors.has(error.message);return NextResponse.json({error:known?(error as Error).message:'Não foi possível confirmar a alteração. Confira o acesso antes de tentar novamente.',success:null},{status:known?400:500,headers});}
}
