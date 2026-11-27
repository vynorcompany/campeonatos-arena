import "server-only";
import {headers} from "next/headers";
import {managementCookieHeader} from "@/lib/backend/management-context-client";
import {backendOrigin} from "@/lib/backend/http-client";
import {configurationFields,configurationFileFields,configurationFileLimit,configurationInputSchema,configurationOutcomeSchema,type ConfigurationOperation} from "@/lib/backend/contracts/arena-configuration";
export async function remoteConfigurationMutation(origin:string,operation:ConfigurationOperation,form:FormData){
 const fields:Record<string,string[]>={};for(const key of configurationFields[operation]){const values=form.getAll(key);if(values.some(value=>typeof value!=='string'))throw Error('Campo inválido.');if(values.length)fields[key]=values as string[];}
 const fileField=configurationFileFields[operation];let file;
 if(fileField){const values=form.getAll(fileField);if(values.length>1)throw Error('Arquivo repetido.');const value=values[0];if(value instanceof File&&value.size){if(value.size>configurationFileLimit(operation))throw Error('Arquivo acima do limite.');file={name:value.name,type:value.type,base64:Buffer.from(await value.arrayBuffer()).toString('base64')};}else if(value&&!(value instanceof File))throw Error('Arquivo inválido.');}
 const payload=configurationInputSchema(operation).parse({fields,...(file?{file}:{})});const cookie=await managementCookieHeader();const requestOrigin=(await headers()).get('origin');
 const response=await fetch(new URL(`/api/management/arena/actions/${operation}`,backendOrigin(origin)),{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',...(cookie?{cookie}:{}),...(requestOrigin?{origin:requestOrigin}:{})},body:JSON.stringify(payload),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(90000)});
 const result=configurationOutcomeSchema.parse(await response.json());return response.ok?result:{error:result.error??'Não foi possível confirmar a alteração.',success:null};
}
