import "server-only";
import {withArenaTransaction} from "@/lib/rls";
import {getTvPresentationPayload,getManualUpcomingMatchesPayload} from "./tv-presentation";
import {tvWorkspaceSchema,type TvView} from "../contracts/tv";
export async function resolveTvWorkspace(arenaId:string,view:TvView){
 const payload=await getTvPresentationPayload(arenaId);
 const [arena,tournaments,leagueCycles]=await withArenaTransaction(arenaId,tx=>Promise.all([
  tx.arena.findUniqueOrThrow({where:{id:arenaId},select:{logoUrl:true}}),
  view==="settings"?tx.tournament.findMany({where:{arenaId,status:{not:"FINISHED"}},orderBy:{createdAt:"desc"},select:{id:true,name:true,status:true}}):Promise.resolve([]),
  view==="settings"?tx.leagueCycle.findMany({where:{status:"OPEN",competition:{category:{tournament:{arenaId}}}},orderBy:{updatedAt:"desc"},select:{id:true,prizeDescription:true,competition:{select:{category:{select:{name:true}}}}}}):Promise.resolve([]),
 ]));
 const manualMatches=view==="settings"?await getManualUpcomingMatchesPayload(arenaId):[];
 return tvWorkspaceSchema.parse({payload,arenaLogoUrl:arena.logoUrl||"/arena-profile.jpg",manualMatches,tournaments,leagueCycles});
}
