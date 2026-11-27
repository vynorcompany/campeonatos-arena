import{NextRequest,NextResponse}from"next/server";
import{getArenaAccessDecision}from"@/lib/backend/services/management-session";
import{canViewModule}from"@/lib/permissions";
import{getTvPresentationPayload}from"@/lib/backend/services/tv-presentation";
import{tvPayloadSchema}from"@/lib/backend/contracts/tv";
import{createShortSnapshotCache}from"@/lib/short-snapshot-cache";
const snapshot=createShortSnapshotCache(10000);
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
 const decision=await getArenaAccessDecision(),auth=decision.auth;
 if(!auth)return NextResponse.json({error:"Acesso à arena indisponível."},{status:decision.redirectTo==="/login"?401:403,headers:{"Cache-Control":"private, no-store",Vary:"Cookie"}});
 if(!canViewModule("tv",auth.arenaRole,auth.systemRole,auth.viewPermissions))return NextResponse.json({error:"Sem permissão para visualizar a TV."},{status:403,headers:{"Cache-Control":"private, no-store",Vary:"Cookie"}});
 if(request.nextUrl.searchParams.size)return NextResponse.json({error:"Consulta inválida."},{status:400,headers:{"Cache-Control":"private, no-store",Vary:"Cookie"}});
 const payload=await snapshot(auth.arenaId,async()=>tvPayloadSchema.parse(await getTvPresentationPayload(auth.arenaId)));
 const headers={"content-type":"application/json","cache-control":"private, no-cache",etag:payload.etag,Vary:"Cookie"};
 return request.headers.get("if-none-match")===payload.etag?new NextResponse(null,{status:304,headers}):new NextResponse(payload.body,{headers});
}
