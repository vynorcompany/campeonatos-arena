import "server-only";
import {headers} from "next/headers";
import {revalidatePath} from "next/cache";
import {refreshTournamentRoutes} from "./revalidation";
import {managementCookieHeader} from "@/lib/backend/management-context-client";
import {backendOrigin} from "@/lib/backend/http-client";
import {tournamentPlayPayload,tournamentPlayOutcomeSchema,type TournamentPlayOperation} from "@/lib/backend/contracts/tournament-play";
const uncertain="Não foi possível confirmar a alteração. Confira o evento antes de tentar novamente.";
export async function runTournamentPlayMutation(operation:TournamentPlayOperation,form:FormData){
 let result;
 try{
  const fields=tournamentPlayPayload(operation,form),origin=process.env.VX4_BACKEND_ORIGIN;
  if(!origin)result=await(await import("@/lib/backend/services/tournament-play-mutations")).executeTournamentPlayMutation(operation,fields);
  else{
   const cookie=await managementCookieHeader(),requestOrigin=(await headers()).get("origin");
   const response=await fetch(new URL(`/api/management/tournaments/play/${operation}`,backendOrigin(origin)),{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json",...(cookie?{cookie}:{}),...(requestOrigin?{origin:requestOrigin}:{})},body:JSON.stringify(fields),cache:"no-store",redirect:"error",signal:AbortSignal.timeout(90000)});
   if(!response.ok)throw Error(uncertain);result=tournamentPlayOutcomeSchema.parse(await response.json());
  }
 }catch{return{error:uncertain,success:null};}
 if(result.refresh)refreshTournamentRoutes();for(const path of result.paths)revalidatePath(path);
 return result.state??{error:null,success:null};
}
