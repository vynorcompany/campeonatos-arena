import {NextRequest,NextResponse} from "next/server";
import {portalClientQuerySchema,portalClientViews,type PortalClientView} from "@/lib/backend/contracts/portal-client";
import {resolvePortalClient} from "@/lib/backend/services/portal-client";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest,context:{params:Promise<{view:string}>}){
 const headers={"Cache-Control":"private, no-store",Vary:"Cookie"};
 const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});
 const view=(await context.params).view;
 if(!(portalClientViews as readonly string[]).includes(view))return fail("Consulta inválida.",404);
 const params=request.nextUrl.searchParams;
 if([...params.keys()].some(key=>params.getAll(key).length!==1))return fail("Filtros inválidos.",400);
 const parsed=portalClientQuerySchema.safeParse(Object.fromEntries(params));
 if(!parsed.success||(view!=="comandas"&&parsed.data.catalog!==undefined))return fail("Filtros inválidos.",400);
 try{
  const result=await resolvePortalClient(view as PortalClientView,parsed.data.arenaSlug,parsed.data.catalog!=="false");
  if(!result.authenticated)return fail("Entre na conta desta arena para continuar.",401);
  return NextResponse.json(result.data,{headers});
 }catch{return fail("Não foi possível consultar os dados do Portal.",503);}
}
