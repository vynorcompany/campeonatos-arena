import "server-only";
import { withArenaTransaction } from "@/lib/rls";
import { assistantHistorySchema } from "@/lib/backend/contracts/assistant";
export async function resolveAssistantHistory(arenaId:string,userId:string) {
  const conversation = await withArenaTransaction(arenaId,tx=>tx.assistantConversation.findUnique({
    where:{arenaId_userId:{arenaId,userId}},
    select:{messages:{select:{id:true,role:true,content:true,createdAt:true},orderBy:{createdAt:"asc"},take:80}}
  }));
  return assistantHistorySchema.parse({messages:conversation?.messages.map(row=>({...row,createdAt:row.createdAt.toISOString()}))??[]});
}
