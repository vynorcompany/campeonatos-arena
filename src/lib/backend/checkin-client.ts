import "server-only";
import {cookies,headers} from "next/headers";
import {backendOrigin} from "./http-client";
import {managementCookieHeader} from "./management-context-client";
import {checkinFields,checkinInputSchema,checkinOutcomeSchema,type CheckinOperation} from "./contracts/checkin";
export function checkinPayload(operation:CheckinOperation,form:FormData){const fields:Record<string,string[]>={};for(const key of checkinFields[operation]){const values=form.getAll(key);if(values.some(value=>typeof value!=="string"))throw Error("Campo inválido.");if(values.length)fields[key]=values as string[];}return checkinInputSchema(operation).parse({fields});}
export async function remoteCheckinMutation(origin:string,operation:CheckinOperation,input:ReturnType<typeof checkinPayload>){
 const requestOrigin=(await headers()).get("origin");const token=operation==="configure"?null:(await cookies()).get("arena_player_session")?.value;
 const cookie=operation==="configure"?await managementCookieHeader():token?`arena_player_session=${encodeURIComponent(token)}`:"";
 const path=operation==="configure"?"/api/management/checkin":`/api/portal/checkin/actions/${operation}`;
 const response=await fetch(new URL(path,backendOrigin(origin)),{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json",...(cookie?{cookie}:{}),...(requestOrigin?{origin:requestOrigin}:{})},body:JSON.stringify(input),cache:"no-store",redirect:"error",signal:AbortSignal.timeout(60000)});
 const result=checkinOutcomeSchema.parse(await response.json());return response.ok?result:{error:result.error??"Não foi possível confirmar o check-in."};
}
