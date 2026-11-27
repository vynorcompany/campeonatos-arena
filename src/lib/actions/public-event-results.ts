"use server";
import {runEventResultMutation} from "@/lib/portal/event-result-mutation";
export async function recordOwnEventMatchResultAction(form:FormData){return runEventResultMutation("match",form);}
export async function recordOwnTrioGameResultAction(form:FormData){return runEventResultMutation("trio",form);}
