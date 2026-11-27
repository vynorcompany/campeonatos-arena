import {NextRequest,NextResponse} from "next/server";
import {getPublicPlayerAuth} from "@/lib/backend/services/player-session";
import {allowedFrontendOrigin} from "@/lib/backend/origin-policy";
import {readBoundedJson,RequestBodyTooLargeError} from "@/lib/http/json-body";
import {checkinInputSchema,type CheckinOperation} from "@/lib/backend/contracts/checkin";
import {executeCheckinMutation} from "@/lib/backend/services/checkin-mutations";
import {publicCheckinError} from "@/lib/backend/checkin-operation-error";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest,context:{params:Promise<{operation:string}>}) {
 const headers={"Cache-Control":"private, no-store",Vary:"Cookie"},fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});
 if(!allowedFrontendOrigin(request.headers.get("origin"),process.env.VX4_FRONTEND_ORIGINS))return fail("Origem não autorizada.",403);
 const raw=(await context.params).operation;if(!["court","lesson","share"].includes(raw))return fail("Operação inválida.",404);
 const operation=raw as CheckinOperation;let input;
 try{input=checkinInputSchema(operation).parse(await readBoundedJson(request,65536));}catch(error){return fail("Revise os dados do check-in.",error instanceof RequestBodyTooLargeError?413:400);}
 if(!await getPublicPlayerAuth(input.fields.arenaSlug[0]))return fail("Entre na sua conta para realizar o check-in.",401);
 try{return NextResponse.json(await executeCheckinMutation(operation,input.fields),{headers});}catch(error){const message=publicCheckinError(error);return fail(message??"Não foi possível confirmar o check-in. Confira sua presença antes de tentar novamente.",message?400:500);}
}
