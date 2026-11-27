import "server-only";
import {cookies} from "next/headers";
import {backendOrigin} from "@/lib/backend/http-client";
import {portalCompetitionResponses,portalCompetitionQuerySchema,type PortalCompetitionView} from "@/lib/backend/contracts/portal-competition";
export async function readPortalCompetition(view:PortalCompetitionView,input:Record<string,string|undefined>){
 const query=portalCompetitionQuerySchema(view).parse(Object.fromEntries(Object.entries(input).filter(([,value])=>value!==undefined))),origin=process.env.VX4_BACKEND_ORIGIN;
 if(!origin){const result=await(await import("@/lib/backend/services/portal-competition")).resolvePortalCompetition(view,query);return result.authenticated?result.data:null;}
 const token=(await cookies()).get("arena_player_session")?.value;
 const response=await fetch(new URL(`/api/portal/competition/${view}?${new URLSearchParams(query as Record<string,string>)}`,backendOrigin(origin)),{headers:{Accept:"application/json",...(token?{cookie:`arena_player_session=${encodeURIComponent(token)}`}:{})},cache:"no-store",redirect:"error",signal:AbortSignal.timeout(60000)});
 if(response.status===401)return null;if(!response.ok)throw Error("Não foi possível consultar as competições.");return portalCompetitionResponses[view].parse(await response.json());
}
