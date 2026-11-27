import "server-only";
import{getTvWorkspace}from"@/lib/tv/query";
export async function getTvPresentationPayload(arenaId:string){return(await getTvWorkspace(arenaId,"presentation")).payload;}
export async function getManualUpcomingMatchesPayload(arenaId:string){return(await getTvWorkspace(arenaId,"settings")).manualMatches;}
