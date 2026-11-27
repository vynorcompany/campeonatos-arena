"use server";
import {runConfigurationMutation} from "@/lib/arena-configuration/mutation";
export async function createAgentApiKeyAction(form:FormData){return runConfigurationMutation('agent-create',form);}
export async function revokeAgentApiKeyAction(form:FormData){return runConfigurationMutation('agent-revoke',form);}
