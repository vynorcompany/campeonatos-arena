import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import { calculateBankAccountBalanceCents } from "../src/lib/finance/bank-balance";

test("saldo bancário inclui receitas atuais, legadas e baixas parciais sem duplicar contas quitadas", async () => {
  const queries: { kind: string; where: Record<string, unknown> }[] = [];
  const tx = {
    financialSettlement: {
      aggregate: async ({ where }: { where: Record<string, unknown> }) => {
        queries.push({ kind: "settlement", where });
        return { _sum: { amountCents: queries.length === 1 ? 2000 : 300 } };
      },
    },
    financialEntry: {
      aggregate: async ({ where }: { where: Record<string, unknown> }) => {
        queries.push({ kind: "legacy", where });
        return { _sum: { amountCents: queries.length === 3 ? 500 : 100 } };
      },
    },
  } as unknown as Pick<Prisma.TransactionClient, "financialEntry" | "financialSettlement">;

  const balance = await calculateBankAccountBalanceCents(tx, "arena-a", "bank-a", 1000);
  assert.equal(balance, 3100);
  assert.equal(queries.length, 4);
  for (const query of queries) {
    const where = query.where as { arenaId: string; financialEntry?: { arenaId: string; bankAccountId: string; status: unknown; type: unknown }; bankAccountId?: string; status?: string; settlements?: unknown };
    assert.equal(where.arenaId, "arena-a");
    assert.equal((where.financialEntry ?? where).bankAccountId, "bank-a");
    if (query.kind === "settlement") assert.deepEqual(where.financialEntry?.status, { not: "VOIDED" });
    else {
      assert.equal(where.status, "PAID");
      assert.deepEqual(where.settlements, { none: {} });
    }
  }
  assert.deepEqual((queries[0].where.financialEntry as { type: unknown }).type, { in: ["REVENUE", "INCOME"] });
  assert.equal((queries[1].where.financialEntry as { type: unknown }).type, "EXPENSE");
});
