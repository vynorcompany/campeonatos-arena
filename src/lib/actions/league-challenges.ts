"use server";
import {runLeagueMutation} from "@/lib/portal/league-mutation";
export async function createLeagueChallengeAction(form:FormData){const result=await runLeagueMutation("propose",form);if(result.error)throw Error(result.error);}
export async function recordOwnLeagueMatchResultAction(form:FormData){const outcome=await runLeagueMutation("score",form);return outcome.result??{success:false as const,error:outcome.error??"Não foi possível confirmar o resultado."};}
export async function respondLeagueChallengeAction(form:FormData){const result=await runLeagueMutation("challenge",form);if(result.error)throw Error(result.error);}
export async function respondLeagueProposalAction(form:FormData):Promise<void|{error:string}>{const result=await runLeagueMutation("proposal",form);if(result.error)return{error:result.error};}
