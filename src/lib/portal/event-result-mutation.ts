import "server-only";
import {cookies,headers} from "next/headers";
import {revalidatePath} from "next/cache";
import {backendOrigin} from "@/lib/backend/http-client";
import {eventResultFields,eventResultInputSchema,eventResultOutcomeSchema,type EventResultOperation} from "@/lib/backend/contracts/event-results";
export async function runEventResultMutation(operation:EventResultOperation,form:FormData){try{
 const fields:Record<string,string[]>={};for(const key of eventResultFields[operation]){const values=form.getAll(key);if(values.some(value=>typeof value!=="string"))throw Error("Campo inválido.");if(values.length)fields[key]=values as string[];}const input=eventResultInputSchema(operation).parse({fields}),origin=process.env.VX4_BACKEND_ORIGIN;let result;
 if(!origin)result=await(await import("@/lib/backend/services/event-result-mutations")).executeEventResultMutation(operation,input.fields);
 else{const token=(await cookies()).get("arena_player_session")?.value,browserOrigin=(await headers()).get("origin");const response=await fetch(new URL(`/api/portal/events/${operation}`,backendOrigin(origin)),{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json",...(token?{cookie:`arena_player_session=${encodeURIComponent(token)}`} :{}),...(browserOrigin?{origin:browserOrigin}:{})},body:JSON.stringify(input),cache:"no-store",redirect:"error",signal:AbortSignal.timeout(90000)});result=eventResultOutcomeSchema.parse(await response.json());}
 if(result.success){revalidatePath("/home");revalidatePath(`/classificacao/${input.fields.arenaSlug[0]}`);revalidatePath("/torneios","layout");}return result;
 }catch{return{success:false as const,error:"Não foi possível confirmar o resultado. Confira o jogo antes de tentar novamente."};}}
