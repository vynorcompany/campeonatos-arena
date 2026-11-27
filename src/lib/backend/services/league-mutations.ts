import "server-only";
import * as challenges from "./league-challenges";
import * as medical from "./league-medical-substitutions";
import {isLeagueOperationError,leagueOperationMessage} from "./league-operation-errors";
import {leagueActionOutcomeSchema,type LeagueActionOperation} from "../contracts/league-actions";
const actions={propose:challenges.createLeagueChallengeAction,score:challenges.recordOwnLeagueMatchResultAction,challenge:challenges.respondLeagueChallengeAction,proposal:challenges.respondLeagueProposalAction,medical:medical.requestLeagueMedicalSubstitutionAction,review:medical.reviewLeagueMedicalSubstitutionAction};
export async function executeLeagueMutation(operation:LeagueActionOperation,fields:Record<string,string[]>){const form=new FormData();for(const[key,values]of Object.entries(fields))for(const value of values)form.append(key,value);try{const result=await actions[operation](form);return leagueActionOutcomeSchema.parse(operation==="score"?{error:null,result}:result&&"error"in result?{error:result.error}:{error:null});}catch(error){if(isLeagueOperationError(error))return{error:leagueOperationMessage(error)};throw error;}}
