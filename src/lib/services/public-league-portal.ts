import "server-only";
import {cookies} from "next/headers";
import {backendOrigin} from "@/lib/backend/http-client";
import {decodePortalLeague,portalLeagueSchema,portalLeagueQuerySchema} from "@/lib/backend/contracts/portal-league";
export async function getPublicLeaguePortal(arenaSlug:string,_playerId:string,requestedCategoryId?:string){
 const query=portalLeagueQuerySchema.parse({arenaSlug,...(requestedCategoryId!==undefined?{categoryId:requestedCategoryId}:{})}),origin=process.env.VX4_BACKEND_ORIGIN;
 if(!origin){const result=await(await import("@/lib/backend/services/portal-league")).resolvePortalLeague(query.arenaSlug,query.categoryId);return decodePortalLeague(result.authenticated?result.data:null);}
 const token=(await cookies()).get("arena_player_session")?.value;
 const response=await fetch(new URL(`/api/portal/league?${new URLSearchParams(query)}`,backendOrigin(origin)),{headers:{Accept:"application/json",...(token?{cookie:`arena_player_session=${encodeURIComponent(token)}`}:{})},cache:"no-store",redirect:"error",signal:AbortSignal.timeout(60000)});
 if(response.status===401)return null;if(!response.ok)throw Error("Não foi possível consultar os jogos e aulas.");return decodePortalLeague(portalLeagueSchema.parse(await response.json()));
}
