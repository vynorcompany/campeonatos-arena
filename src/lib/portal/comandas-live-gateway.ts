import "server-only";
import {backendOrigin} from "@/lib/backend/http-client";
/** Compatibility polling endpoint: cookies and ETag only, never caller-supplied ownership. */
export async function readPortalComandasLive(request:Request,origin:string){
 const slug=new URL(request.url).searchParams.get("arenaSlug")?.trim();
 if(!slug||slug.length>160)return Response.json({error:"Arena inválida."},{status:400});
 const cookie=request.headers.get("cookie")?.split(";").map(value=>value.trim()).find(value=>value.startsWith("arena_player_session="));
 const etag=request.headers.get("if-none-match");
 try{
  const upstream=await fetch(new URL(`/api/portal/comandas?${new URLSearchParams({arenaSlug:slug})}`,backendOrigin(origin)),{headers:{Accept:"application/json",...(cookie?{cookie}:{}),...(etag?{"if-none-match":etag}:{})},cache:"no-store",redirect:"error",signal:AbortSignal.timeout(30000)});
  if(upstream.status>=500){await upstream.body?.cancel();throw Error("Backend unavailable");}
  const headers=new Headers({"Cache-Control":"private, no-store",Vary:"Cookie"});
  for(const name of ["content-type","etag"])if(upstream.headers.has(name))headers.set(name,upstream.headers.get(name)!);
  return new Response(upstream.status===304?null:upstream.body,{status:upstream.status,headers});
 }catch{return Response.json({error:"Não foi possível atualizar as comandas."},{status:503,headers:{"Cache-Control":"private, no-store"}});}
}
