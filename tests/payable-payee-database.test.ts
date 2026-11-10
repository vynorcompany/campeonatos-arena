import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { resolvePayablePayee } from "../src/lib/finance/payable-payee";
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const local = /^postgres(?:ql)?:\/\/[^/]+@127\.0\.0\.1:55433\/arena_goal(?:\?|$)/.test(url);
const form = (kind: string, id: string) => { const value = new FormData(); value.set("payeeKind", kind); value.set("payeeId", id); return value; };

test("favorecidos preservam vínculo canônico sem duplicar fornecedor e rejeitam outra arena", { skip: !local }, async () => {
  const db = new PrismaClient({ datasources: { db: { url } } });
  const rollback = new Error("rollback QA favorecidos");
  try {
    await assert.rejects(db.$transaction(async tx => {
      const a = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" } });
      const b = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" } });
      const user = await tx.user.create({ data: { name: "Funcionário QA", email: `${randomUUID()}@example.invalid`, passwordHash: "!" } });
      const outsider = await tx.user.create({ data: { name: "Funcionário externo QA", email: `${randomUUID()}@example.invalid`, passwordHash: "!" } });
      await tx.arenaMember.create({ data: { arenaId: a.id, userId: user.id } });
      await tx.arenaMember.create({ data: { arenaId: b.id, userId: outsider.id } });
      const teacher = await tx.teacher.create({ data: { arenaId: a.id, name: `Professor QA ${randomUUID()}` } });
      const foreign = await tx.teacher.create({ data: { arenaId: b.id, name: `Professor externo QA ${randomUUID()}` } });
      const inactive = await tx.teacher.create({ data: { arenaId: a.id, name: `Inativo QA ${randomUUID()}`, active: false } });
      const client = await tx.player.create({ data: { arenaId: a.id, name: "Cliente favorecido QA" } });
      const externalClient = await tx.player.create({ data: { arenaId: b.id, name: "Cliente externo QA" } });
      const inactiveClient = await tx.player.create({ data: { arenaId: a.id, name: "Cliente inativo QA", active: false } });
      await tx.$executeRawUnsafe("SET LOCAL ROLE arena_runtime");
      await tx.$executeRaw`SELECT set_config('app.arena_id', ${a.id}, true)`;
      const suppliersBefore = await tx.supplier.count({ where: { arenaId: a.id } });
      for (const [kind, id, name] of [["EMPLOYEE", user.id, user.name], ["TEACHER", teacher.id, teacher.name], ["CLIENT", client.id, client.name]]) {
        const payee = await resolvePayablePayee(tx, a.id, form(kind, id), "Nome adulterado");
        assert.equal(payee.counterpartyName, name);
        assert.equal(payee.supplierId, null);
        const recurrence = await tx.financialRecurrence.create({ data: { ...payee, arenaId: a.id, type: "EXPENSE", category: "QA", description: "Favorecido recorrente QA", amountCents: 12500, frequency: "MONTHLY", startsAt: new Date(), nextDueDate: new Date() } });
        const entry = await tx.financialEntry.create({ data: { ...payee, arenaId: a.id, type: "EXPENSE", category: "QA", description: "Pagamento QA", amountCents: 12500, recurrenceId: recurrence.id } });
        const settled = await tx.financialSettlement.create({ data: { arenaId: a.id, financialEntryId: entry.id, amountCents: 12500, paymentMethod: "PIX", paidAt: new Date() } });
        await tx.financialEntry.update({ where: { id: entry.id }, data: { status: "PAID", paidAt: settled.paidAt } });
        const saved = await tx.financialEntry.findUniqueOrThrow({ where: { id: entry.id } });
        assert.equal(saved.payeeEmployeeId, payee.payeeEmployeeId);
        assert.equal(saved.payeeTeacherId, payee.payeeTeacherId);
        assert.equal(saved.status, "PAID");
        assert.equal(saved.playerId,payee.playerId);
        assert.equal(recurrence.playerId,payee.playerId);
        assert.equal(recurrence.payeeTeacherId, payee.payeeTeacherId);
        assert.equal(recurrence.payeeEmployeeId, payee.payeeEmployeeId);
      }
      assert.equal(await tx.supplier.count({ where: { arenaId: a.id } }), suppliersBefore);
      await assert.rejects(resolvePayablePayee(tx, a.id, form("EMPLOYEE", outsider.id), "Externo"), /funcionário cadastrado/);
      await assert.rejects(resolvePayablePayee(tx, a.id, form("TEACHER", foreign.id), "Externo"), /professor ativo/);
      await assert.rejects(resolvePayablePayee(tx, a.id, form("TEACHER", inactive.id), "Inativo"), /professor ativo/);
      await assert.rejects(resolvePayablePayee(tx,a.id,form("CLIENT",externalClient.id),"Adulterado"),/cliente ativo/);
      await assert.rejects(resolvePayablePayee(tx,a.id,form("CLIENT",inactiveClient.id),"Adulterado"),/cliente ativo/);
      await assert.rejects(resolvePayablePayee(tx,a.id,form("CLIENT",""),"Adulterado"),/cliente ativo/);
      await assert.rejects(resolvePayablePayee(tx, a.id, form("OTHER", user.id), "Inválido"), /Tipo de favorecido/);
      const supplier = await resolvePayablePayee(tx, a.id, form("SUPPLIER", ""), `Fornecedor QA ${randomUUID()}`);
      assert.ok(supplier.supplierId); assert.equal(supplier.payeeTeacherId, null);
      // A savepoint lets us verify the database guard without aborting the test transaction.
      for (const data of [{ payeeEmployeeId: outsider.id }, { payeeTeacherId: foreign.id }]) {
        await tx.$executeRawUnsafe("SAVEPOINT payee_scope");
        await assert.rejects(tx.financialEntry.create({ data: { arenaId: a.id, type: "EXPENSE", category: "QA", description: "Inválido", amountCents: 1, ...data } }), /42501|another arena/);
        await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT payee_scope");
      }
      throw rollback;
    }, { timeout: 20000 }), error => error === rollback);
  } finally { await db.$disconnect(); }
});
