"use server";
import { requirePermission } from "@/lib/auth/guards";
import { withArenaTransaction } from "@/lib/rls";
export async function clientComandaPermissionDefaultAction() {
  const auth=await requirePermission("players:create");
  const settings=await withArenaTransaction(auth.arenaId,tx=>tx.arenaOperationalSettings.findUnique({where:{arenaId:auth.arenaId},select:{blockDelinquentComandas:true}}));
  return !settings?.blockDelinquentComandas;
}
