import "server-only";
import {cookies,headers} from "next/headers";
import {revalidatePath} from "next/cache";
import {backendOrigin} from "@/lib/backend/http-client";
import {leagueActionFields,leagueActionInputSchema,leagueActionOutcomeSchema,type LeagueActionOperation} from "@/lib/backend/contracts/league-actions";
export async function runLeagueMutation(operation:LeagueActionOperation,form:FormData){
 try{const fields:Record<string,string[]>={};for(const key of leagueActionFields[operation]){const values=form.getAll(key);if(values.some(value=>typeof value!=="string"))throw Error("Campo inválido.");if(values.length)fields[key]=values as string[];}const input=leagueActionInputSchema(operation).parse({fields}),origin=process.env.VX4_BACKEND_ORIGIN;
 let result;
 if(!origin)result=await(await import("@/lib/backend/services/league-mutations")).executeLeagueMutation(operation,input.fields);
 else{const jar=await cookies(),names=operation==="review"?["padel_session","padel_arena"]:["arena_player_session"],cookie=names.flatMap(name=>{const value=jar.get(name)?.value;return value?[`${name}=${encodeURIComponent(value)}`]:[];}).join("; "),browserOrigin=(await headers()).get("origin");const response=await fetch(new URL(operation==="review"?"/api/management/league/medical":`/api/portal/league/actions/${operation}`,backendOrigin(origin)),{method:"POST",headers:{Accept:"application/json","Content-Type":"application/json",...(cookie?{cookie}:{}),...(browserOrigin?{origin:browserOrigin}:{})},body:JSON.stringify(input),cache:"no-store",redirect:"error",signal:AbortSignal.timeout(90000)});result=leagueActionOutcomeSchema.parse(await response.json());}
 if(!result.error&&(!result.result||result.result.success)){revalidatePath("/home");revalidatePath("/classificacao","layout");if(["challenge","proposal"].includes(operation))revalidatePath("/agenda");if(["score","review"].includes(operation))revalidatePath("/torneios","layout");}
 return result;
 }catch{return{error:"Não foi possível confirmar a operação. Confira os dados antes de tentar novamente."};}
}
