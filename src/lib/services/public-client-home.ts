import "server-only";
import {cookies} from "next/headers";
import {backendOrigin} from "@/lib/backend/http-client";
import {portalClientResponses,portalHomeSchema,portalFinanceSchema,portalComandasSchema,type PortalClientView} from "@/lib/backend/contracts/portal-client";
async function query(view:PortalClientView,arenaSlug:string,catalog=true){
 const origin=process.env.VX4_BACKEND_ORIGIN;
 if(!origin){
  // Temporary compatibility until the final frontend artifact is isolated.
  const result=await(await import("@/lib/backend/services/portal-client")).resolvePortalClient(view,arenaSlug,catalog);
  if(!result.authenticated)return null;
  return result.data;
 }
 const token=(await cookies()).get("arena_player_session")?.value;
 const params=new URLSearchParams({arenaSlug,...(view==="comandas"?{catalog:String(catalog)}:{})});
 const response=await fetch(new URL(`/api/portal/client/${view}?${params}`,backendOrigin(origin)),{headers:{Accept:"application/json",...(token?{cookie:`arena_player_session=${encodeURIComponent(token)}`}:{})},cache:"no-store",redirect:"error",signal:AbortSignal.timeout(30000)});
 if(response.status===401)return null;
 if(!response.ok)throw Error("Não foi possível consultar os dados do Portal.");
 return portalClientResponses[view].parse(await response.json());
}
export async function getPublicClientHome(arenaSlug:string,_playerId:string){const data=portalHomeSchema.parse(await query("home",arenaSlug));return data?{...data,events:data.events.map(event=>({...event,scheduledAt:new Date(event.scheduledAt)}))}:null;}
export async function getPublicClientFinance(arenaSlug:string,_playerId:string){return portalFinanceSchema.parse(await query("finance",arenaSlug));}
export async function getPublicClientComandas(arenaSlug:string,_playerId:string,{catalog=true}:{catalog?:boolean}={}){return portalComandasSchema.parse(await query("comandas",arenaSlug,catalog));}
