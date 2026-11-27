import "server-only";
import {headers} from "next/headers";
import {revalidatePath} from "next/cache";
import {backendOrigin} from "@/lib/backend/http-client";
import {publicRegistrationFields,publicRegistrationInputSchema,publicRegistrationOutcomeSchema,type PublicRegistrationState} from "@/lib/backend/contracts/public-registration";
export async function runPublicRegistration(form:FormData):Promise<PublicRegistrationState>{try{
 const fields:Record<string,string[]>={};for(const key of publicRegistrationFields){const values=form.getAll(key);if(values.some(value=>typeof value!=="string"))throw Error("Campo inválido.");if(values.length)fields[key]=values as string[];}const input=publicRegistrationInputSchema.parse({fields}),origin=process.env.VX4_BACKEND_ORIGIN;let result;
 if(!origin)result=await(await import("@/lib/backend/services/public-registration-mutation")).executePublicRegistration(input.fields);
 else{const browserOrigin=(await headers()).get("origin");const response=await fetch(new URL("/api/public/registrations",backendOrigin(origin)),{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json",...(browserOrigin?{origin:browserOrigin}:{})},body:JSON.stringify(input),cache:"no-store",redirect:"error",signal:AbortSignal.timeout(120000)});result=publicRegistrationOutcomeSchema.parse(await response.json());}
 // A provider failure can follow a committed registration/cancellation. Refresh
 // the affected screens after that confirmed backend response as well.
 if(result.committed){revalidatePath("/financeiro/contas-a-receber");revalidatePath("/torneios/inscricoes");revalidatePath(`/inscricao/${input.fields.tournamentSlug[0]}`);}return result.state;
 }catch{return{error:"Não foi possível confirmar a inscrição. Confira a situação antes de tentar novamente.",success:null};}}
