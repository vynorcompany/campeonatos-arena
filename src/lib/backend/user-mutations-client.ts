import "server-only";
import {headers} from "next/headers";
import {managementCookieHeader} from "@/lib/backend/management-context-client";
import {backendOrigin} from "@/lib/backend/http-client";
import {userInputSchema,userMutationFields,userOutcomeSchema,type UserOperation} from "@/lib/backend/contracts/user-mutations";
export async function remoteUserMutation(origin:string,operation:UserOperation,form:FormData){
 const fields:Record<string,string|string[]>={};
 for(const key of userMutationFields[operation]){const values=form.getAll(key);if(values.some(value=>typeof value!=='string'))throw Error('Campo inválido.');if(key==='viewPermissions'||key==='editPermissions')fields[key]=values as string[];else{if(values.length>1)throw Error('Campo repetido.');if(values.length)fields[key]=values[0] as string;}}
 const payload=userInputSchema(operation).parse(fields);const cookie=await managementCookieHeader();const requestOrigin=(await headers()).get('origin');
 const response=await fetch(new URL(`/api/management/access/users/actions/${operation}`,backendOrigin(origin)),{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',...(cookie?{cookie}:{}),...(requestOrigin?{origin:requestOrigin}:{})},body:JSON.stringify(payload),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(60000)});
 const result=userOutcomeSchema.parse(await response.json());return response.ok?result:{error:result.error??'Não foi possível confirmar a alteração.',success:null};
}
