import {NextRequest,NextResponse} from "next/server";
import {requireArenaAccess} from "@/lib/backend/services/management-session";
import {allowedFrontendOrigin} from "@/lib/backend/origin-policy";
import {readBoundedJson,RequestBodyTooLargeError} from "@/lib/http/json-body";
import {accessOperations,accessInputSchema,accessOutcomeSchema,canManageAccess,type AccessOperation} from "@/lib/backend/contracts/arena-access";
import {createPermissionProfileAction,updatePermissionProfileAction,deletePermissionProfileAction} from "@/lib/backend/services/permission-profiles";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest,context:{params:Promise<{operation:string}>}) {
 const headers={"Cache-Control":"private, no-store",Vary:"Cookie"};
 if(!allowedFrontendOrigin(request.headers.get('origin'),process.env.VX4_FRONTEND_ORIGINS))return NextResponse.json({error:"Origem não autorizada."},{status:403,headers});
 const auth=await requireArenaAccess();if(!canManageAccess(auth))return NextResponse.json({error:"Sem permissão para gerenciar acessos."},{status:403,headers});
 const raw=(await context.params).operation;if(!accessOperations.includes(raw as AccessOperation))return NextResponse.json({error:"Operação inválida."},{status:404,headers});
 let payload;try{payload=accessInputSchema(raw as AccessOperation).parse(await readBoundedJson(request,256*1024));}catch(error){return NextResponse.json({error:"Dados do perfil inválidos."},{status:error instanceof RequestBodyTooLargeError?413:400,headers});}
 const form=new FormData();for(const[key,value]of Object.entries(payload)){if(Array.isArray(value))for(const item of value)form.append(key,item);else form.set(key,value);}
 try{return NextResponse.json(accessOutcomeSchema.parse(raw==='create'?await createPermissionProfileAction(form):raw==='update'?await updatePermissionProfileAction(form):await deletePermissionProfileAction(form)),{headers});}
 catch(error){const known=["Perfil não encontrado nesta arena.","Remova ou altere o perfil dos usuários vinculados antes de excluir este perfil."];
 return NextResponse.json({error:error instanceof Error&&known.includes(error.message)?error.message:"Não foi possível confirmar a alteração. Confira os perfis antes de tentar novamente."},{status:error instanceof Error&&known.includes(error.message)?400:500,headers});}
}
