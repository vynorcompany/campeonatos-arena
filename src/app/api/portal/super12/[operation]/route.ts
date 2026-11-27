import {NextRequest,NextResponse} from "next/server";
import {allowedFrontendOrigin} from "@/lib/backend/origin-policy";
import {getPublicPlayerAuth} from "@/lib/backend/services/player-session";
import {readBoundedJson,RequestBodyTooLargeError} from "@/lib/http/json-body";
import {portalSuper12Fields,portalSuper12InputSchema,type PortalSuper12Operation} from "@/lib/backend/contracts/portal-super12-actions";
import {executePortalSuper12Mutation} from "@/lib/backend/services/portal-super12-mutations";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest,context:{params:Promise<{operation:string}>}){
 const headers={"Cache-Control":"private, no-store",Vary:"Cookie"},fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});
 if(!allowedFrontendOrigin(request.headers.get("origin"),process.env.VX4_FRONTEND_ORIGINS))return fail("Origem não autorizada.",403);
 const raw=(await context.params).operation;if(!Object.hasOwn(portalSuper12Fields,raw))return fail("Operação inválida.",404);const operation=raw as PortalSuper12Operation;
 let input;try{input=portalSuper12InputSchema(operation).parse(await readBoundedJson(request,98304));}catch(error){return fail("Revise os campos informados.",error instanceof RequestBodyTooLargeError?413:400);}
 if(!await getPublicPlayerAuth(input.fields.arenaSlug[0]))return fail("Entre na conta desta arena para continuar.",401);
 try{return NextResponse.json(await executePortalSuper12Mutation(operation,input.fields),{headers});}catch{return fail("Não foi possível confirmar a operação. Confira a rodada antes de tentar novamente.",503);}
}
