import { z } from "zod";
export const tournamentPlayFields = {"entry-points": ["entryId", "points"], "entries": ["tournamentId", "playerIds"], "pairs-generate": ["tournamentId"], "pair-create": ["tournamentId", "playerAId", "playerBId"], "pair-update": ["pairId", "playerAId", "playerBId"], "pair-delete": ["pairId"], "pair-points": ["pairId", "totalPoints"], "pair-group": ["pairId", "targetGroupId"], "groups-generate": ["tournamentId"], "matches-generate": ["tournamentId"], "match-court": ["matchId", "courtName"], "match-schedule": ["matchId", "scheduledTime"], "match-result": ["matchId", "homeScore", "awayScore"], "match-participants": ["matchId", "homePairId", "awayPairId"], "match-status": ["matchId", "manualStatus"], "match-tv": ["matchId", "showOnTv"]} as const;
export type TournamentPlayOperation = keyof typeof tournamentPlayFields;
export function tournamentPlayInputSchema(operation:TournamentPlayOperation){
 return z.record(z.string(),z.array(z.string().max(200)).max(1000)).superRefine((fields,ctx)=>{
  for(const [key,values] of Object.entries(fields))if(!(tournamentPlayFields[operation] as readonly string[]).includes(key)||(key!=="playerIds"&&values.length!==1))ctx.addIssue({code:"custom",message:"Campo inválido.",path:[key]});
 });
}
export function tournamentPlayPayload(operation:TournamentPlayOperation,form:FormData){
 const fields:Record<string,string[]>={};for(const key of tournamentPlayFields[operation]){const values=form.getAll(key);if(values.some(value=>typeof value!=="string"))throw Error("Campo inválido.");if(values.length)fields[key]=values as string[];}
 return tournamentPlayInputSchema(operation).parse(fields);
}
export const tournamentPlayOutcomeSchema=z.object({state:z.object({error:z.string().nullable(),success:z.string().nullable()}).strict().nullable(),refresh:z.boolean(),paths:z.array(z.literal("/proximos-jogos/tv")).max(1)}).strict();
