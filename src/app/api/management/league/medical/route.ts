import {NextRequest,NextResponse} from "next/server";
import {allowedFrontendOrigin} from "@/lib/backend/origin-policy";
import {getArenaAccessDecision} from "@/lib/backend/services/management-session";
import {canPerformPermission} from "@/lib/permissions";
import {readBoundedJson,RequestBodyTooLargeError} from "@/lib/http/json-body";
import {leagueActionInputSchema} from "@/lib/backend/contracts/league-actions";
import {executeLeagueMutation} from "@/lib/backend/services/league-mutations";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest){
 const headers={"Cache-Control":"private, no-store",Vary:"Cookie"},fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});
 if(!allowedFrontendOrigin(request.headers.get("origin"),process.env.VX4_FRONTEND_ORIGINS))return fail("Origem não autorizada.",403);
 const{auth}=await getArenaAccessDecision();if(!auth||!canPerformPermission("tournaments:manage",auth.arenaRole,auth.systemRole,auth.editPermissions))return fail("Sem permissão para analisar a substituição.",403);
 let input;try{input=leagueActionInputSchema("review").parse(await readBoundedJson(request,8192));}catch(error){return fail("Revise os campos informados.",error instanceof RequestBodyTooLargeError?413:400);}
 try{return NextResponse.json(await executeLeagueMutation("review",input.fields),{headers});}catch{return fail("Não foi possível confirmar a análise. Confira os dados antes de tentar novamente.",503);}
}
