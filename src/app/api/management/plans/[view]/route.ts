import{NextRequest,NextResponse}from"next/server";
import{getArenaAccessDecision}from"@/lib/backend/services/management-session";
import{canViewModule}from"@/lib/permissions";
import{planListQuerySchema,planDetailQuerySchema}from"@/lib/backend/contracts/plan-queries";
import{resolvePlanList,resolvePlanDetail}from"@/lib/backend/services/plan-queries";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest,context:{params:Promise<{view:string}>}){
 const headers={"Cache-Control":"private, no-store",Vary:"Cookie"},fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});
 const decision=await getArenaAccessDecision(),auth=decision.auth;if(!auth)return fail("Acesso à arena indisponível.",decision.redirectTo==="/login"?401:403);
 if(!canViewModule("tv",auth.arenaRole,auth.systemRole,auth.viewPermissions))return fail("Sem permissão para consultar planos.",403);
 const{view}=await context.params;if(view!=="list"&&view!=="detail")return fail("Consulta inválida.",404);
 const params=request.nextUrl.searchParams;if([...params.keys()].some(key=>params.getAll(key).length!==1))return fail("Filtros inválidos.",400);
 const query=Object.fromEntries(params);
 try{if(view==="list"){const parsed=planListQuerySchema.safeParse(query);return parsed.success?NextResponse.json(await resolvePlanList(auth.arenaId,parsed.data),{headers}):fail("Filtros inválidos.",400);}const parsed=planDetailQuerySchema.safeParse(query);if(!parsed.success)return fail("Filtros inválidos.",400);const data=await resolvePlanDetail(auth.arenaId,parsed.data.id);return data?NextResponse.json(data,{headers}):fail("Plano não encontrado.",404);}catch{return fail("Não foi possível consultar os planos. Tente novamente.",503);}
}
