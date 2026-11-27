import {NextRequest,NextResponse} from "next/server";
import {portalCompetitionViews,portalCompetitionQuerySchema,type PortalCompetitionView} from "@/lib/backend/contracts/portal-competition";
import {resolvePortalCompetition} from "@/lib/backend/services/portal-competition";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest,context:{params:Promise<{view:string}>}){
 const headers={"Cache-Control":"private, no-store",Vary:"Cookie"},fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});
 const view=(await context.params).view;if(!(portalCompetitionViews as readonly string[]).includes(view))return fail("Consulta inválida.",404);
 const params=request.nextUrl.searchParams;if([...params.keys()].some(key=>params.getAll(key).length!==1))return fail("Filtros inválidos.",400);
 const parsed=portalCompetitionQuerySchema(view as PortalCompetitionView).safeParse(Object.fromEntries(params));if(!parsed.success)return fail("Filtros inválidos.",400);
 try{const result=await resolvePortalCompetition(view as PortalCompetitionView,parsed.data);return result.authenticated?NextResponse.json(result.data,{headers}):fail("Entre na conta desta arena para continuar.",401);}catch{return fail("Não foi possível consultar as competições.",503);}
}
