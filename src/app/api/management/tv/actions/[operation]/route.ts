import{NextRequest,NextResponse}from"next/server";
import{ZodError}from"zod";
import{getArenaAccessDecision}from"@/lib/backend/services/management-session";
import{canEditModule,canPerformPermission}from"@/lib/permissions";
import{allowedFrontendOrigin}from"@/lib/backend/origin-policy";
import{readBoundedJson,RequestBodyTooLargeError}from"@/lib/http/json-body";
import{upcomingFields,upcomingInputSchema,upcomingFileLimit,type UpcomingOperation}from"@/lib/backend/contracts/upcoming";
import{executeUpcomingMutation}from"@/lib/backend/services/upcoming-mutations";
import{publicUpcomingError}from"@/lib/backend/upcoming-operation-error";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest,context:{params:Promise<{operation:string}>}){
 const headers={"Cache-Control":"private, no-store",Vary:"Cookie"},fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});
 if(!allowedFrontendOrigin(request.headers.get("origin"),process.env.VX4_FRONTEND_ORIGINS))return fail("Origem não autorizada.",403);
 const{operation:raw}=await context.params;if(!Object.hasOwn(upcomingFields,raw))return fail("Operação inválida.",404);const operation=raw as UpcomingOperation;
 const decision=await getArenaAccessDecision(),auth=decision.auth;if(!auth)return fail("Acesso à arena indisponível.",decision.redirectTo==="/login"?401:403);
 if(!canEditModule("tv",auth.arenaRole,auth.systemRole,auth.editPermissions))return fail("Sem permissão para alterar TV ou patrocínios.",403);
 let input;try{input=upcomingInputSchema(operation).parse(await readBoundedJson(request,Math.ceil(upcomingFileLimit*4/3)+512*1024));}catch(error){return fail("Revise os campos e a imagem.",error instanceof RequestBodyTooLargeError?413:400);}
 const permissions=operation==="fixed-enroll"?["calendar:booking:create","finance:receivable:create",...(input.fields.firstPaid?.[0]==="on"?["finance:receivable:edit"]:[])]:operation==="fixed-end"?["calendar:booking:cancel","finance:receivable:edit"]:[];
 if(permissions.some(permission=>!canPerformPermission(permission,auth.arenaRole,auth.systemRole,auth.editPermissions)))return fail("Sem permissão para alterar reservas ou cobranças do plano.",403);
 if(input.file&&Buffer.from(input.file.base64,"base64").length>upcomingFileLimit)return fail("A foto deve ter no máximo 4 MB.",413);
 try{return NextResponse.json(await executeUpcomingMutation(operation,input),{headers});}catch(error){const message=publicUpcomingError(error);return fail(message??(error instanceof ZodError?"Revise os campos informados.":"Não foi possível confirmar a alteração. Confira os dados antes de tentar novamente."),message||error instanceof ZodError?400:500);}
}
