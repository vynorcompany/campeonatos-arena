import "server-only";
import { revalidatePath } from "next/cache";
import { remoteAssistantCommand } from "@/lib/backend/assistant-client";
import type { AssistantReply } from "@/lib/backend/contracts/assistant";
export async function runAssistantCommand(input:string):Promise<AssistantReply> {
  const origin = process.env.VX4_BACKEND_ORIGIN;
  const result = origin ? await remoteAssistantCommand(origin,input) : await (await import("@/lib/backend/services/assistant-actions")).runArenaAssistantCommandAction(input);
  if (result.refreshFinance) {
    revalidatePath("/assistente");revalidatePath("/financeiro/contas-a-receber");revalidatePath("/painel");
  }
  return {ok:result.ok,message:result.message,createdAt:result.createdAt};
}
