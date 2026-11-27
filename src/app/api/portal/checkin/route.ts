import{NextRequest,NextResponse}from"next/server";
import{checkinViewInputSchema}from"@/lib/backend/contracts/checkin";
import{resolveCheckinView}from"@/lib/backend/services/checkin-view";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){const headers={"Cache-Control":"private, no-store",Vary:"Cookie"},fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});const params=request.nextUrl.searchParams;if([...params.keys()].some(key=>params.getAll(key).length!==1))return fail("Filtros inválidos.",400);const parsed=checkinViewInputSchema.safeParse(Object.fromEntries(params));if(!parsed.success)return fail("Filtros inválidos.",400);try{const data=await resolveCheckinView(parsed.data.arenaSlug,parsed.data.token,parsed.data.focusId);return data?NextResponse.json(data,{headers}):fail("QR Code indisponível.",404);}catch{return fail("Não foi possível consultar o check-in.",503);}}
