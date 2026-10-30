import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { PrismaClient } from "@prisma/client";
import { arenaDatabaseForTest } from "./helpers/arena-database";
import { lessonSchema } from "../src/lib/academy/action-schemas";
import { getFormValues, parseMoneyToCents, parseScheduledAt } from "../src/lib/academy/inputs";
import { requireReceivingBankAccount } from "../src/lib/finance/receiving-bank-account";

const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const local = /^postgresql:\/\/postgres@127\.0\.0\.1:55433\/arena_goal(?:\?|$)/.test(url);
test("aula paga exige conta ativa da arena antes de registrar aula e receita; aula gratuita não exige conta", { skip: !local }, async () => {
  const db = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const suffix = randomUUID();
  const bankIds: string[] = [];
  const title = `Aula banco ${suffix}`;
  try {
    const arena = await db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" } });
    const beta = await db.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" } });
    for (const [arenaId, active] of [[arena.id, true], [arena.id, false], [beta.id, true]] as const) {
      bankIds.push((await db.bankAccount.create({ data: { arenaId, active, name: `Conta ${suffix}-${bankIds.length}` } })).id);
    }
    const exports: { createLessonAction?: (form: FormData) => Promise<unknown> } = {};
    const mocks: Record<string, unknown> = {
      "@/lib/auth/guards": { requireModuleEdit: async () => ({ arenaId: arena.id }) },
      "@/lib/arena-database": { arenaDatabase: (id: string) => arenaDatabaseForTest(runtime, id) },
      "@/lib/academy/action-schemas": { lessonSchema },
      "@/lib/academy/inputs": { getFormValues, parseMoneyToCents, parseScheduledAt },
      "@/lib/academy/revalidation": { refreshAcademyRoutes() {} },
      "@/lib/finance/receiving-bank-account": { requireReceivingBankAccount },
    };
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/actions/academy.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Date, require: (name: string) => mocks[name] ?? {} });
    const form = (bank = "", paid = true) => {
      const data = new FormData();
      for (const [key, value] of Object.entries({ title, teacherId: "", scheduledAt: "", durationMinutes: "60", isPaid: paid ? "on" : "", price: "120,00", paymentMethod: "PIX", notes: "", bankAccountId: bank })) data.set(key, value);
      return data;
    };
    for (const bank of ["", bankIds[1], bankIds[2]]) await assert.rejects(exports.createLessonAction!(form(bank)), /conta bancária/);
    assert.equal(await db.lesson.count({ where: { title } }), 0);
    assert.equal(await db.financialEntry.count({ where: { description: { startsWith: title } } }), 0);
    await exports.createLessonAction!(form(bankIds[0]));
    const receipt = await db.financialEntry.findFirstOrThrow({ where: { description: { startsWith: title } } });
    assert.equal(receipt.bankAccountId, bankIds[0]);
    assert.equal(receipt.amountCents, 12000);
    assert.equal(receipt.status, "PAID");
    await exports.createLessonAction!(form("", false));
    assert.equal(await db.lesson.count({ where: { title } }), 2);
    assert.equal(await db.financialEntry.count({ where: { description: { startsWith: title } } }), 1);
  } finally {
    await db.financialEntry.deleteMany({ where: { description: { startsWith: title } } });
    await db.lesson.deleteMany({ where: { title } });
    await db.bankAccount.deleteMany({ where: { id: { in: bankIds } } });
    await runtime.$disconnect(); await db.$disconnect();
  }
});
