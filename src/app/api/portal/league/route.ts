import {NextRequest,NextResponse} from "next/server";
import {portalLeagueQuerySchema} from "@/lib/backend/contracts/portal-league";
import {resolvePortalLeague} from "@/lib/backend/services/portal-league";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
 const headers={"Cache-Control":"private, no-store",Vary:"Cookie"},fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});
 const query=request.nextUrl.searchParams;if([...query.keys()].some(key=>query.getAll(key).length!==1))return fail("Filtros inválidos.",400);
 const input=portalLeagueQuerySchema.safeParse(Object.fromEntries(query));if(!input.success)return fail("Filtros inválidos.",400);
 try{const result=await resolvePortalLeague(input.data.arenaSlug,input.data.categoryId);return result.authenticated?NextResponse.json(result.data,{headers}):fail("Entre na conta desta arena para continuar.",401);}catch{return fail("Não foi possível consultar os jogos e aulas.",503);}
}
