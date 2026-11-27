import {NextRequest,NextResponse} from "next/server";
import {allowedFrontendOrigin} from "@/lib/backend/origin-policy";
import {getPublicPlayerAuth} from "@/lib/backend/services/player-session";
import {readBoundedJson,RequestBodyTooLargeError} from "@/lib/http/json-body";
import {leagueActionFields,leagueActionInputSchema,type LeagueActionOperation} from "@/lib/backend/contracts/league-actions";
import {executeLeagueMutation} from "@/lib/backend/services/league-mutations";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest,context:{params:Promise<{operation:string}>}){
 const headers={"Cache-Control":"private, no-store",Vary:"Cookie"},fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});
 if(!allowedFrontendOrigin(request.headers.get("origin"),process.env.VX4_FRONTEND_ORIGINS))return fail("Origem não autorizada.",403);
 const raw=(await context.params).operation;if(raw==="review"||!Object.hasOwn(leagueActionFields,raw))return fail("Operação inválida.",404);const operation=raw as LeagueActionOperation;
 let input;try{input=leagueActionInputSchema(operation).parse(await readBoundedJson(request,32768));}catch(error){return fail("Revise os campos informados.",error instanceof RequestBodyTooLargeError?413:400);}
 if(!await getPublicPlayerAuth(input.fields.arenaSlug[0]))return fail("Entre na conta desta arena para continuar.",401);
 try{return NextResponse.json(await executeLeagueMutation(operation,input.fields),{headers});}catch{return fail("Não foi possível confirmar a operação. Confira os dados antes de tentar novamente.",503);}
}
