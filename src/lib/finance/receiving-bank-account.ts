import type { Prisma } from "@prisma/client";

export async function requireReceivingBankAccount(db: Pick<Prisma.TransactionClient, "bankAccount">, arenaId: string, bankAccountId: unknown): Promise<string> {
  const id = typeof bankAccountId === "string" ? bankAccountId.trim() : "";
  if (!id) throw new Error("Selecione a conta bancária do recebimento.");
  const account = await db.bankAccount.findFirst({ where: { id, arenaId, active: true }, select: { id: true } });
  if (!account) throw new Error("Selecione uma conta bancária ativa desta arena.");
  return account.id;
}
