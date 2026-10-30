import { withArenaTransaction } from "@/lib/rls";
import { syncClientLoyaltyNotifications } from "./client-loyalty-notifications";

const checks = new Map<string, { checkedAt: number; pending?: Promise<void> }>();
/** One scan per arena per minute per process; durable notification IDs also protect multiple replicas. */
export async function refreshLoyaltyNotifications(arenaId: string) {
  const now = Date.now();
  const previous = checks.get(arenaId);
  if (previous?.pending) return previous.pending;
  if (previous && now - previous.checkedAt < 60_000) return;
  if (checks.size > 1000) for (const [key, value] of checks) if (!value.pending && now - value.checkedAt > 60_000) checks.delete(key);
  const pending = withArenaTransaction(arenaId, tx => syncClientLoyaltyNotifications(tx, arenaId)).then(() => { checks.set(arenaId, { checkedAt: Date.now() }); }).catch(error => { checks.delete(arenaId); throw error; });
  checks.set(arenaId, { checkedAt: now, pending });
  return pending;
}
