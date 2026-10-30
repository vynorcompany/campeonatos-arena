import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import { calculateBankAccountBalanceCents, parseBankBalanceCents } from "../src/lib/finance/bank-balance";

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
    if (query.kind === "settlement") {
      assert.deepEqual(where.financialEntry?.status, { not: "VOIDED" });
      assert.deepEqual(query.where.OR, [{ bankAccountId: "bank-a" }, { bankAccountId: null, financialEntry: { bankAccountId: "bank-a" } }]);
    }
    else {
      assert.equal(where.bankAccountId, "bank-a");
      assert.equal(where.status, "PAID");
      assert.deepEqual(where.settlements, { none: {} });
    }
  }
  assert.deepEqual((queries[0].where.financialEntry as { type: unknown }).type, { in: ["REVENUE", "INCOME"] });
  assert.equal((queries[1].where.financialEntry as { type: unknown }).type, "EXPENSE");
});

test("conferência aceita saldo negativo e rejeita texto que viraria ajuste indevido", () => {
  assert.equal(parseBankBalanceCents("R$ 1.250,50"), 125050);
  assert.equal(parseBankBalanceCents("-250,00"), -25000);
  assert.equal(parseBankBalanceCents("-R$ 250,00"), -25000);
  assert.equal(parseBankBalanceCents("10.50"), 1050);
  assert.equal(parseBankBalanceCents("0,00"), 0);
  assert.equal(parseBankBalanceCents("1.000"), 100000);
  for (const value of ["abc", "", "1,2,3", "--1", "99999999999999", "1.23,00"]) assert.throws(() => parseBankBalanceCents(value));
});
