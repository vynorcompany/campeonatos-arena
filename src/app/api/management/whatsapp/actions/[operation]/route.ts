import { NextRequest, NextResponse } from "next/server";
import { requireArenaAccess } from "@/lib/backend/services/management-session";
import { canManageWhatsApp, canSendWhatsApp, canViewModule } from "@/lib/permissions";
import { allowedFrontendOrigin } from "@/lib/backend/origin-policy";
import { readBoundedMultipart } from "@/lib/http/multipart-body";
import { RequestBodyTooLargeError } from "@/lib/http/json-body";
import { projectWhatsAppMutation, whatsAppMutationFields, whatsAppUncertainMessage, type WhatsAppMutationOperation } from "@/lib/backend/contracts/whatsapp-mutations";
import { executeWhatsAppMutation } from "@/lib/backend/services/whatsapp-chat-mutations";
export const dynamic="force-dynamic";
const send=new Set(["open-player","open-contact","react","send-text","send-audio","send-media"]),view=new Set(["read","profile-photo","group-name"]);
export async function POST(request:NextRequest,context:{params:Promise<{operation:string}>}) {
 const headers={"Cache-Control":"private, no-store",Vary:"Cookie"};const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});
 if(!allowedFrontendOrigin(request.headers.get("origin"),process.env.VX4_FRONTEND_ORIGINS))return fail("Origem não autorizada.",403);
 const auth=await requireArenaAccess(),raw=(await context.params).operation;
 if(!Object.hasOwn(whatsAppMutationFields,raw))return fail("Operação inválida.",404);
 const operation=raw as WhatsAppMutationOperation;
 const allowed=send.has(operation)?canSendWhatsApp(auth.arenaRole,auth.systemRole,auth.editPermissions):view.has(operation)?canViewModule("support",auth.arenaRole,auth.systemRole,auth.viewPermissions):canManageWhatsApp(auth.arenaRole,auth.systemRole,auth.editPermissions);
 if(!allowed)return fail("Sem permissão para executar esta operação do WhatsApp.",403);
 let form:FormData;
 try {form=projectWhatsAppMutation(operation,await readBoundedMultipart(request,operation==="send-audio"||operation==="send-media"?17*1024*1024:128*1024),true);} catch(error){return fail("Dados inválidos.",error instanceof RequestBodyTooLargeError?413:400);}
 try {return NextResponse.json(await executeWhatsAppMutation(operation,form),{headers});} catch{return fail(whatsAppUncertainMessage,500);}
}
