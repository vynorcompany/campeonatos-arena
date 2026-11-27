import {NextRequest,NextResponse} from "next/server";
import {requireArenaAccess} from "@/lib/backend/services/management-session";
import {canEditModule,canPerformPermission,canManageTournamentMatches,canRecordTournamentMatchResult} from "@/lib/permissions";
import {allowedFrontendOrigin} from "@/lib/backend/origin-policy";
import {readBoundedJson,RequestBodyTooLargeError} from "@/lib/http/json-body";
import {tournamentPlayFields,tournamentPlayInputSchema,type TournamentPlayOperation} from "@/lib/backend/contracts/tournament-play";
import {executeTournamentPlayMutation} from "@/lib/backend/services/tournament-play-mutations";
export const dynamic="force-dynamic";
export async function POST(request:NextRequest,context:{params:Promise<{operation:string}>}){
 const headers={"Cache-Control":"private, no-store",Vary:"Cookie"},fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});
 if(!allowedFrontendOrigin(request.headers.get("origin"),process.env.VX4_FRONTEND_ORIGINS))return fail("Origem não autorizada.",403);
 const auth=await requireArenaAccess(),raw=(await context.params).operation;
 if(!Object.hasOwn(tournamentPlayFields,raw))return fail("Operação inválida.",404);
 const operation=raw as TournamentPlayOperation;
 const permitted=operation==="match-result"?canRecordTournamentMatchResult(auth.arenaRole,auth.systemRole,auth.viewPermissions,auth.editPermissions)
  :operation.startsWith("match-")||operation==="matches-generate"?canManageTournamentMatches(auth.arenaRole,auth.systemRole,auth.viewPermissions,auth.editPermissions)
  :["entry-points","entries"].includes(operation)?canPerformPermission("tournaments:manage",auth.arenaRole,auth.systemRole,auth.editPermissions)
  :canEditModule(["pair-group","groups-generate"].includes(operation)?"groups":"pairs",auth.arenaRole,auth.systemRole,auth.editPermissions);
 if(!permitted)return fail("Sem permissão para alterar o evento.",403);
 let input;try{input=tournamentPlayInputSchema(operation).parse(await readBoundedJson(request,256*1024));}catch(error){return fail("Dados inválidos.",error instanceof RequestBodyTooLargeError?413:400);}
 try{return NextResponse.json(await executeTournamentPlayMutation(operation,input),{headers});}catch{return fail("Não foi possível confirmar a alteração. Confira o evento antes de tentar novamente.",500);}
}
