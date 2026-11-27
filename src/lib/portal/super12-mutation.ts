import "server-only";
import {cookies,headers} from "next/headers";
import {revalidatePath} from "next/cache";
import {backendOrigin} from "@/lib/backend/http-client";
import {portalSuper12Fields,portalSuper12InputSchema,portalSuper12OutcomeSchema,type PortalSuper12Operation} from "@/lib/backend/contracts/portal-super12-actions";
export async function runPortalSuper12Mutation(operation:PortalSuper12Operation,form:FormData){
 try{
  const fields:Record<string,string[]>={};for(const key of portalSuper12Fields[operation]){const values=form.getAll(key);if(values.some(value=>typeof value!=="string"))throw Error("Campo inválido.");if(values.length)fields[key]=values as string[];}
  const input=portalSuper12InputSchema(operation).parse({fields}),origin=process.env.VX4_BACKEND_ORIGIN;
  let result;
  if(!origin)result=await(await import("@/lib/backend/services/portal-super12-mutations")).executePortalSuper12Mutation(operation,input.fields);
  else{
   const token=(await cookies()).get("arena_player_session")?.value,browserOrigin=(await headers()).get("origin");
   const response=await fetch(new URL(`/api/portal/super12/${operation}`,backendOrigin(origin)),{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json",...(token?{cookie:`arena_player_session=${encodeURIComponent(token)}`} :{}),...(browserOrigin?{origin:browserOrigin}:{})},body:JSON.stringify(input),cache:"no-store",redirect:"error",signal:AbortSignal.timeout(90000)});
   result=portalSuper12OutcomeSchema.parse(await response.json());
  }
  if(!result.error)revalidatePath(`/classificacao/${input.fields.arenaSlug[0]}`);
  return result;
 }catch{return{error:"Não foi possível confirmar a operação. Confira a rodada antes de tentar novamente."};}
}
