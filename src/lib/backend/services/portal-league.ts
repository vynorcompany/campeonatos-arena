import "server-only";
import {getPublicPlayerAuth} from "./player-session";
import {getPublicLeaguePortal} from "./public-league-portal";
import {portalLeagueSchema} from "../contracts/portal-league";
export async function resolvePortalLeague(arenaSlug:string,categoryId?:string){
 const auth=await getPublicPlayerAuth(arenaSlug);if(!auth)return{authenticated:false,data:null};
 const data=await getPublicLeaguePortal(arenaSlug,auth.playerId,categoryId);
 return{authenticated:true,data:portalLeagueSchema.parse(data?{...data,leagueResults:data.leagueResults.map(row=>({...row,updatedAt:row.updatedAt.toISOString()})),leagueNotifications:data.leagueNotifications.map(row=>({...row,createdAt:row.createdAt.toISOString()}))}:null)};
}
