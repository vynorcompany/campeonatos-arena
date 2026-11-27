import "server-only";
import{tvWorkspaceSchema,type TvView}from"@/lib/backend/contracts/tv";
import{readBackendContract}from"@/lib/backend/http-client";
import{managementCookieHeader}from"@/lib/backend/management-context-client";
export async function getTvWorkspace(arenaId:string,view:TvView){
 const origin=process.env.VX4_BACKEND_ORIGIN;
 return origin?readBackendContract(origin,`/api/management/tv?view=${view}`,tvWorkspaceSchema,{cookie:(await managementCookieHeader())??""},{timeoutMs:60000}):(await import("@/lib/backend/services/tv-workspace")).resolveTvWorkspace(arenaId,view);
}
