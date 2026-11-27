import "server-only";
import { readBackendContract } from "@/lib/backend/http-client";
import { managementCookieHeader } from "@/lib/backend/management-context-client";
import { reportQuerySchema,reportWorkspaceSchema,type ReportQuery } from "@/lib/backend/contracts/report-workspace";
type Filters=Omit<ReportQuery,"report"|"quadra">&{quadra?:string|string[]};
export async function getReportWorkspace(report:string,filters:Filters={}){
 try{
  const query=reportQuerySchema.parse({report,...Object.fromEntries(Object.entries(filters).filter(([,value])=>value!==undefined)),...(filters.quadra!==undefined?{quadra:typeof filters.quadra==="string"?[filters.quadra]:filters.quadra}:{})});
  const search=new URLSearchParams(Object.entries(query).flatMap(([key,value])=>typeof value==="string"?[[key,value]]:[]));for(const courtId of query.quadra??[])search.append("quadra",courtId);
  const origin=process.env.VX4_BACKEND_ORIGIN;
  return origin?await readBackendContract(origin,`/api/management/reports?${search}`,reportWorkspaceSchema,{cookie:await managementCookieHeader()??""}):await(await import("@/lib/backend/services/report-workspace")).resolveReportWorkspace(query);
 }catch{throw Error("Não foi possível consultar o relatório.");}
}
