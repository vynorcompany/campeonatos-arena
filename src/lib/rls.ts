import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ArenaTransaction = Prisma.TransactionClient;

export async function setArenaRlsContext(tx: ArenaTransaction, arenaId: string) {
  if (!arenaId.trim()) throw new Error("A arena ativa é obrigatória para acessar dados operacionais.");

  await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`;
}

export async function withArenaTransaction<T>(arenaId: string, operation: (tx: ArenaTransaction) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    await setArenaRlsContext(tx, arenaId);
    return operation(tx);
  });
}
