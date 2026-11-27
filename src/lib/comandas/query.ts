import "server-only";
import {comandaListQuerySchema,comandaListSchema,comandaDocumentSchema,type ComandaListQuery} from "@/lib/backend/contracts/comanda-queries";
import {readBackendContract,backendOrigin} from "@/lib/backend/http-client";
import {managementCookieHeader} from "@/lib/backend/management-context-client";
export async function getComandaList(arenaId:string,query:ComandaListQuery){
 const parsed=comandaListQuerySchema.parse(query);const origin=process.env.VX4_BACKEND_ORIGIN;
 return origin?readBackendContract(origin,`/api/management/comandas/list?${new URLSearchParams(parsed)}`,comandaListSchema,{cookie:(await managementCookieHeader())??""},{timeoutMs:60000}):(await import("@/lib/backend/services/comanda-queries")).resolveComandaList(arenaId,parsed);
}
export async function getComandaDocument(arenaId:string,id:string,view:"detail"|"print"){
 const origin=process.env.VX4_BACKEND_ORIGIN;
 if(!origin)return (await import("@/lib/backend/services/comanda-queries")).resolveComandaDocument(arenaId,id,view);
 const response=await fetch(new URL(`/api/management/comandas/document?${new URLSearchParams({id,view})}`,backendOrigin(origin)),{headers:{Accept:"application/json",cookie:(await managementCookieHeader())??""},cache:"no-store",redirect:"error",signal:AbortSignal.timeout(60000)});
 if(response.status===404)return null;if(!response.ok)throw new Error("Não foi possível consultar a comanda.");return comandaDocumentSchema.parse(await response.json());
}
