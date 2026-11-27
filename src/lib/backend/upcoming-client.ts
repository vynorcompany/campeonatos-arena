import"server-only";
import{headers}from"next/headers";
import{managementCookieHeader}from"./management-context-client";
import{backendOrigin}from"./http-client";
import{upcomingFields,upcomingFileOperations,upcomingFileLimit,upcomingInputSchema,upcomingOutcomeSchema,type UpcomingOperation}from"./contracts/upcoming";
export async function upcomingPayload(operation:UpcomingOperation,form:FormData){
 const fields:Record<string,string[]>={};for(const key of upcomingFields[operation]){const values=form.getAll(key);if(values.some(value=>typeof value!=="string"))throw Error("Campo inválido.");if(values.length)fields[key]=values as string[];}
 let file;if(upcomingFileOperations.includes(operation)){const files=form.getAll("logo");if(files.length>1)throw Error("Arquivo repetido.");const value=files[0];if(value instanceof File&&value.size){if(value.size>upcomingFileLimit)throw Error("A foto deve ter no máximo 4 MB.");file={name:value.name,type:value.type,base64:Buffer.from(await value.arrayBuffer()).toString("base64")};}else if(value&&!(value instanceof File))throw Error("Arquivo inválido.");}
 return upcomingInputSchema(operation).parse({fields,...(file?{file}:{})});
}
export async function remoteUpcomingMutation(origin:string,operation:UpcomingOperation,input:Awaited<ReturnType<typeof upcomingPayload>>){
 const cookie=await managementCookieHeader(),requestOrigin=(await headers()).get("origin");
 const response=await fetch(new URL(`/api/management/tv/actions/${operation}`,backendOrigin(origin)),{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json",...(cookie?{cookie}:{}),...(requestOrigin?{origin:requestOrigin}:{})},body:JSON.stringify(input),cache:"no-store",redirect:"error",signal:AbortSignal.timeout(90000)});
 const result=upcomingOutcomeSchema.parse(await response.json());return response.ok?result:{error:result.error??"Não foi possível confirmar a alteração."};
}
