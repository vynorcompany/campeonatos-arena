import "server-only";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { backendOrigin } from "@/lib/backend/http-client";
import { managementCookieHeader } from "@/lib/backend/management-context-client";
import { projectWhatsAppMutation, whatsAppMutationOutcomeSchema, whatsAppUncertainMessage, type WhatsAppMutationOperation, type WhatsAppMutationResult, type WhatsAppActionReply } from "@/lib/backend/contracts/whatsapp-mutations";
export async function runWhatsAppMutation<T extends WhatsAppMutationOperation>(operation:T,form:FormData):Promise<WhatsAppMutationResult<T>> {
 let outcome;
 try {
  const payload=projectWhatsAppMutation(operation,form),origin=process.env.VX4_BACKEND_ORIGIN;
  if(!origin) outcome=await(await import("@/lib/backend/services/whatsapp-chat-mutations")).executeWhatsAppMutation(operation,payload);
  else {
   const cookie=await managementCookieHeader(),requestOrigin=(await headers()).get("origin");
   const response=await fetch(new URL(`/api/management/whatsapp/actions/${operation}`,backendOrigin(origin)),{method:"POST",headers:{Accept:"application/json",...(cookie?{cookie}:{}),...(requestOrigin?{origin:requestOrigin}:{})},body:payload,cache:"no-store",redirect:"error",signal:AbortSignal.timeout(90000)});
   if(!response.ok) throw Error(whatsAppUncertainMessage);
   outcome=whatsAppMutationOutcomeSchema(operation).parse(await response.json());
  }
 } catch {throw Error(whatsAppUncertainMessage);}
 try {for(const item of outcome.paths)revalidatePath(item.path,item.type);} catch {throw Error(whatsAppUncertainMessage);}
 if(outcome.error)throw Error(outcome.error);
 return outcome.result as WhatsAppMutationResult<T>;
}

/** Serializable notices survive Next's production error redaction without leaking internal exceptions. */
export async function runWhatsAppAction<T extends WhatsAppMutationOperation>(operation:T,form:FormData):Promise<WhatsAppActionReply<WhatsAppMutationResult<T>>> {
 try {return {ok:true,value:await runWhatsAppMutation(operation,form)};} catch(error) {return {ok:false,error:error instanceof Error?error.message:whatsAppUncertainMessage};}
}
