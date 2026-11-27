import "server-only";
import {headers} from "next/headers";
import {managementCookieHeader} from "@/lib/backend/management-context-client";
import {backendOrigin} from "@/lib/backend/http-client";
import {accessInputSchema,accessOutcomeSchema,accessFailureSchema,type AccessOperation} from "@/lib/backend/contracts/arena-access";
export async function remoteAccessMutation(origin:string,operation:AccessOperation,form:FormData) {
 const fields:Record<string,string|string[]>={};
 for(const key of operation==='delete'?['profileId']:['name','description','financialEntryDelete',...(operation==='update'?['profileId']:[]),'viewPermissions','editPermissions']) {
  const values=form.getAll(key);if(values.some(value=>typeof value!=='string'))throw Error('Campo inválido.');
  if(key==='viewPermissions'||key==='editPermissions')fields[key]=values as string[];
  else {if(values.length>1)throw Error('Campo repetido.');if(values.length)fields[key]=values[0] as string;}
 }
 const payload=accessInputSchema(operation).parse(fields);const cookie=await managementCookieHeader();const requestOrigin=(await headers()).get('origin');
 const response=await fetch(new URL(`/api/management/access/profiles/actions/${operation}`,backendOrigin(origin)),{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',...(cookie?{cookie}:{}),...(requestOrigin?{origin:requestOrigin}:{})},body:JSON.stringify(payload),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(60000)});
 const result=await response.json();if(!response.ok)throw Error(accessFailureSchema.parse(result).error);return accessOutcomeSchema.parse(result);
}
