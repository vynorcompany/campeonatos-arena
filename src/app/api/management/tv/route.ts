import{NextRequest,NextResponse}from"next/server";
import{getArenaAccessDecision}from"@/lib/backend/services/management-session";
import{canViewModule}from"@/lib/permissions";
import{tvViewSchema}from"@/lib/backend/contracts/tv";
import{resolveTvWorkspace}from"@/lib/backend/services/tv-workspace";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
 const headers={"Cache-Control":"private, no-store",Vary:"Cookie"};const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});
 const decision=await getArenaAccessDecision(),auth=decision.auth;
 if(!auth)return fail("Acesso à arena indisponível.",decision.redirectTo==="/login"?401:403);
 if(!canViewModule("tv",auth.arenaRole,auth.systemRole,auth.viewPermissions))return fail("Sem permissão para visualizar a TV.",403);
 const params=request.nextUrl.searchParams,view=tvViewSchema.safeParse(params.get("view"));
 if(params.size!==1||!view.success)return fail("Consulta inválida.",400);
 try{return NextResponse.json(await resolveTvWorkspace(auth.arenaId,view.data),{headers});}catch{return fail("Não foi possível consultar a TV. Tente novamente.",503);}
}
