"use server";
import { runAssistantCommand } from "@/lib/assistant/command-mutation";
import type { AssistantReply } from "@/lib/backend/contracts/assistant";
export async function runArenaAssistantCommandAction(input:string):Promise<AssistantReply> { return runAssistantCommand(input); }
