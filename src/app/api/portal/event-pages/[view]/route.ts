import {NextRequest,NextResponse} from "next/server";
import {publicEventPageSchemas,publicEventPageQuerySchema,type PublicEventPageView} from "@/lib/backend/contracts/public-event-pages";
import {resolvePublicEventPage,resolvePublicEventReceipt} from "@/lib/backend/services/public-event-pages";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest,context:{params:Promise<{view:string}>}){
 const headers={"Cache-Control":"private, no-store"},fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});const raw=(await context.params).view;if(!Object.hasOwn(publicEventPageSchemas,raw))return fail("Consulta inválida.",404);const view=raw as PublicEventPageView;
 const query=request.nextUrl.searchParams;if([...query.keys()].some(key=>query.getAll(key).length!==1))return fail("Filtros inválidos.",400);const input=publicEventPageQuerySchema(view).safeParse(Object.fromEntries(query));if(!input.success)return fail("Filtros inválidos.",400);
 try{return NextResponse.json(view==="page"?await resolvePublicEventPage(input.data.slug):await resolvePublicEventReceipt(input.data.slug,input.data.registrationId!),{headers});}catch{return fail("Não foi possível consultar o evento.",503);}
}
