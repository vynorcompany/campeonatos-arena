import "server-only";
import {getPublicPlayerAuth} from "./player-session";
import {getPublicClientHome,getPublicClientFinance,getPublicClientComandas} from "./public-client-home";
import {portalClientResponses,type PortalClientView} from "../contracts/portal-client";
/** No player identifier from a caller establishes access to these private views. */
export async function resolvePortalClient(view:PortalClientView,arenaSlug:string,catalog=true){
 const auth=await getPublicPlayerAuth(arenaSlug);
 if(!auth)return {authenticated:false as const,data:null};
 if(view==="home"){
  const home=await getPublicClientHome(arenaSlug,auth.playerId);
  return {authenticated:true as const,data:portalClientResponses.home.parse(home?{...home,events:home.events.map(event=>({...event,scheduledAt:event.scheduledAt.toISOString()}))}:null)};
 }
 const data=view==="finance"?await getPublicClientFinance(arenaSlug,auth.playerId):await getPublicClientComandas(arenaSlug,auth.playerId,{catalog});
 return {authenticated:true as const,data:portalClientResponses[view].parse(data)};
}
