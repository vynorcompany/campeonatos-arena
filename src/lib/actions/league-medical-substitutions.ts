"use server";
import {runLeagueMutation} from "@/lib/portal/league-mutation";
export async function requestLeagueMedicalSubstitutionAction(form:FormData){const result=await runLeagueMutation("medical",form);if(result.error)throw Error(result.error);}
export async function reviewLeagueMedicalSubstitutionAction(form:FormData){const result=await runLeagueMutation("review",form);if(result.error)throw Error(result.error);}
