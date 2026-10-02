import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);

function actions(registers: Record<string, unknown>[]) {
  const source = readFileSync(new URL("../src/lib/actions/cash-register.ts", import.meta.url), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const tx = { cashRegister: {
    findFirst: async ({ where }: { where: Record<string, unknown> }) => registers.find((row) =>
      Object.entries(where).every(([key, value]) => value instanceof Date
        ? String(row[key]) === String(value) : row[key] === value)),
    create: async ({ data }: { data: Record<string, unknown> }) => {
      const row = { id: `session-${registers.length + 1}`, status: "OPEN", ...data };
      registers.push(row);
      return row;
    }
  } };
  const exports: Record<string, (form: FormData) => Promise<void>> = {};
  vm.runInNewContext(output, { exports, FormData, Date, require: (name: string) => {
    if (name === "next/cache") return { revalidatePath() {} };
    if (name === "@/lib/auth/guards") return { requirePermission: async () => ({ arenaId: "arena", userName: "Operador" }) };
    if (name === "@/lib/finance/cash-day") return { cashReferenceDate: () => new Date("2026-10-02T00:00:00Z") };
    if (name === "@/lib/rls") return { withArenaTransaction: async (_id: string, fn: (tx: unknown) => unknown) => fn(tx) };
    return require(name);
  } });
  return exports;
}

function opening() {
  const form = new FormData();
  form.set("openingAmount", "120,50");
  form.set("openingNotes", "Segundo turno");
  return form;
}

test("a closed cash session stays intact when another session opens on the same day", async () => {
  const closed = { id: "closed", arenaId: "arena", referenceDate: new Date("2026-10-02T00:00:00Z"), status: "CLOSED", countedAmountCents: 15000, differenceCents: -100, closedByName: "Primeiro operador" };
  const snapshot = structuredClone(closed);
  const registers: Record<string, unknown>[] = [closed];
  await actions(registers).openCashRegisterAction(opening());
  assert.deepEqual(closed, snapshot);
  assert.equal(registers.length, 2);
  assert.equal(registers[1].status, "OPEN");
  assert.equal(registers[1].openingAmountCents, 12050);
  assert.equal(registers[1].expectedAmountCents, 12050);
  assert.equal(registers[1].openedByName, "Operador");
});

test("a second opening is rejected while today's cash session is open", async () => {
  const registers: Record<string, unknown>[] = [];
  const action = actions(registers).openCashRegisterAction;
  await action(opening());
  await assert.rejects(action(opening()), /Já existe um caixa aberto/);
  assert.equal(registers.length, 1);
});
