import {NextRequest,NextResponse} from "next/server";
import {requireArenaAccess} from "@/lib/backend/services/management-session";
import {canPerformPermission,canManageTournamentMatches} from "@/lib/permissions";
import {allowedFrontendOrigin} from "@/lib/backend/origin-policy";
import {readBoundedJson,RequestBodyTooLargeError} from "@/lib/http/json-body";
import {tournamentRegistrationFields,tournamentRegistrationInputSchema,type TournamentRegistrationOperation} from "@/lib/backend/contracts/tournament-registration-actions";
import {executeTournamentRegistrationMutation} from "@/lib/backend/services/tournament-registration-mutations";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest,context:{params:Promise<{operation:string}>}){
 const headers={"Cache-Control":"private, no-store",Vary:"Cookie"},fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});
 if(!allowedFrontendOrigin(request.headers.get("origin"),process.env.VX4_FRONTEND_ORIGINS))return fail("Origem não autorizada.",403);
 const auth=await requireArenaAccess(),raw=(await context.params).operation;
 if(!Object.hasOwn(tournamentRegistrationFields,raw))return fail("Operação inválida.",404);
 const operation=raw as TournamentRegistrationOperation;
 const permitted=operation==="bracket-schedule"?canManageTournamentMatches(auth.arenaRole,auth.systemRole,auth.viewPermissions,auth.editPermissions):canPerformPermission("tournaments:manage",auth.arenaRole,auth.systemRole,auth.editPermissions);
 if(!permitted||operation==="receive-onsite"&&!canPerformPermission("finance:receivable:settle",auth.arenaRole,auth.systemRole,auth.editPermissions))return fail("Sem permissão para alterar a inscrição.",403);
 let input;try{input=tournamentRegistrationInputSchema(operation).parse(await readBoundedJson(request,256*1024));}catch(error){return fail("Dados inválidos.",error instanceof RequestBodyTooLargeError?413:400);}
 try{return NextResponse.json(await executeTournamentRegistrationMutation(operation,input),{headers});}catch{return fail("Não foi possível confirmar a alteração. Confira a inscrição antes de tentar novamente.",500);}
}
