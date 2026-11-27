import {NextRequest,NextResponse} from "next/server";
import {allowedFrontendOrigin} from "@/lib/backend/origin-policy";
import {readBoundedJson,RequestBodyTooLargeError} from "@/lib/http/json-body";
import {publicRegistrationInputSchema} from "@/lib/backend/contracts/public-registration";
import {executePublicRegistration} from "@/lib/backend/services/public-registration-mutation";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest){
 const headers={"Cache-Control":"private, no-store"},fail=(error:string,status:number)=>NextResponse.json({state:{error,success:null},committed:false},{status,headers});
 if(!allowedFrontendOrigin(request.headers.get("origin"),process.env.VX4_FRONTEND_ORIGINS))return fail("Origem não autorizada.",403);
 let input;try{input=publicRegistrationInputSchema.parse(await readBoundedJson(request,32768));}catch(error){return fail("Revise os dados da inscrição.",error instanceof RequestBodyTooLargeError?413:400);}
 try{return NextResponse.json(await executePublicRegistration(input.fields),{headers});}catch{return fail("Não foi possível confirmar a inscrição. Confira a situação antes de tentar novamente.",503);}
}
