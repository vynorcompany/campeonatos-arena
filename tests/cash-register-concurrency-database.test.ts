import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { PrismaClient } from "@prisma/client";
import { recordCashSaleIfOpen } from "../src/lib/finance/cash-register-sales";
import { parseCashAmountCents } from "../src/lib/finance/cash-day";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try { const url = new URL(testUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal"; }
  catch { return false; }
})();

test("duas aberturas simultâneas deixam um só caixa aberto e permitem nova sessão após fechar", { skip: !disposableDatabase }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const runtimeUrl = new URL(testUrl);
  runtimeUrl.username = "arena_runtime";
  runtimeUrl.password = "";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const referenceDate = new Date(Date.UTC(2040, 0, 1 + (Date.now() % 365)));
  const marker = `GOAL-caixa-${Date.now()}`;
  let arenaId = "";
  try {
    arenaId = (await admin.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } })).id;
    const source = readFileSync(new URL("../src/lib/actions/cash-register.ts", import.meta.url), "utf8");
    const exports: Record<string, (form: FormData) => Promise<void>> = {};
    const require = createRequire(import.meta.url);
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
      exports, FormData, Date,
      require: (name: string) => {
        if (name === "next/cache") return { revalidatePath() {} };
        if (name === "@/lib/auth/guards") return { requirePermission: async () => ({ arenaId, userName: "GOAL" }) };
        if (name === "@/lib/finance/cash-day") return { cashReferenceDate: () => referenceDate, parseCashAmountCents };
        if (name === "@/lib/rls") return { withArenaTransaction: (scope: string, operation: (tx: unknown) => Promise<unknown>) => runtime.$transaction(async (tx) => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${scope}, true)`; return operation(tx); }) };
        return require(name);
      },
    });
    const opening = () => { const form = new FormData(); form.set("openingAmount", "100,00"); form.set("openingNotes", marker); return form; };
    const results = await Promise.allSettled([exports.openCashRegisterAction(opening()), exports.openCashRegisterAction(opening())]);
    assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
    assert.match(String((results.find((result) => result.status === "rejected") as PromiseRejectedResult).reason), /Já existe um caixa aberto/);
    const open = await admin.cashRegister.findMany({ where: { arenaId, referenceDate, status: "OPEN", openingNotes: marker } });
    assert.equal(open.length, 1);

    await admin.cashRegister.update({ where: { id: open[0].id }, data: { status: "CLOSED", closedAt: new Date() } });
    await exports.openCashRegisterAction(opening());
    const reopened = await admin.cashRegister.findFirstOrThrow({ where: { arenaId, referenceDate, status: "OPEN", openingNotes: marker } });
    assert.equal(await admin.cashRegister.count({ where: { arenaId, referenceDate, status: "OPEN", openingNotes: marker } }), 1);

    const excessWithdrawal = new FormData();
    excessWithdrawal.set("registerId", reopened.id); excessWithdrawal.set("type", "WITHDRAWAL"); excessWithdrawal.set("amount", "100,01"); excessWithdrawal.set("description", "");
    await assert.rejects(exports.createCashMovementAction(excessWithdrawal), /sangria excede o saldo esperado/);
    assert.equal(await admin.cashMovement.count({ where: { registerId: reopened.id } }), 0);

    const movement = new FormData();
    movement.set("registerId", reopened.id); movement.set("type", "SUPPLY"); movement.set("amount", "5,00"); movement.set("description", marker);
    const closing = new FormData();
    closing.set("registerId", reopened.id); closing.set("countedAmount", "100,00");
    const concurrent = await Promise.allSettled([exports.createCashMovementAction(movement), exports.closeCashRegisterAction(closing)]);
    assert.equal(concurrent[1].status, "fulfilled");
    if (concurrent[0].status === "rejected") assert.match(String(concurrent[0].reason), /O caixa não está aberto/);
    const closed = await admin.cashRegister.findUniqueOrThrow({ where: { id: reopened.id }, include: { movements: true } });
    assert.equal(closed.status, "CLOSED");
    assert.equal(closed.expectedAmountCents, 10000 + closed.movements.reduce((sum, item) => sum + item.amountCents, 0));

    await exports.openCashRegisterAction(opening());
    const saleRegister = await admin.cashRegister.findFirstOrThrow({ where: { arenaId, referenceDate, status: "OPEN", openingNotes: marker } });
    const saleClose = new FormData();
    saleClose.set("registerId", saleRegister.id); saleClose.set("countedAmount", "100,00");
    const [saleResult, closeResult] = await Promise.allSettled([
      runtime.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`;
        return recordCashSaleIfOpen(tx, { arenaId, referenceDate, amountCents: 2000, description: marker, createdByName: "PDV" });
      }),
      exports.closeCashRegisterAction(saleClose),
    ]);
    assert.equal(saleResult.status, "fulfilled");
    assert.equal(closeResult.status, "fulfilled");
    const afterSale = await admin.cashRegister.findUniqueOrThrow({ where: { id: saleRegister.id }, include: { movements: true } });
    assert.equal(afterSale.status, "CLOSED");
    assert.equal(afterSale.expectedAmountCents, 10000 + afterSale.movements.reduce((sum, item) => sum + item.amountCents, 0));
    assert.equal(afterSale.movements.filter((item) => item.type === "SALE").length, saleResult.value ? 1 : 0);
  } finally {
    if (arenaId) await admin.cashRegister.deleteMany({ where: { arenaId, referenceDate, openingNotes: marker } });
    await runtime.$disconnect();
    await admin.$disconnect();
  }
});
