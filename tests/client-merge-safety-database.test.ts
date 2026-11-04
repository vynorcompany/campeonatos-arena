import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { PrismaClient } from "@prisma/client";
import ts from "typescript";

const nodeRequire = createRequire(import.meta.url);
const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try { const url = new URL(testUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal"; }
  catch { return false; }
})();

test("mesclagem transfere débitos e baixas sem perder dados e impede vínculos incompatíveis", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const rollback = new Error("rollback da mesclagem descartável");
  try {
    const arena = await db.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
    await assert.rejects(db.$transaction(async (tx) => {
      const suffix = randomBytes(6).toString("hex");
      const [primary, duplicate, simple] = await Promise.all([
        tx.player.create({ data: { arenaId: arena.id, name: `Principal ${suffix}`, email: "principal@example.invalid" } }),
        tx.player.create({ data: { arenaId: arena.id, name: `Com histórico ${suffix}`, phone: "42998880001", email: "duplicado@example.invalid", birthDate: new Date("1990-01-02T00:00:00Z") } }),
        tx.player.create({ data: { arenaId: arena.id, name: `Simples ${suffix}` } }),
      ]);
      const reservation = await tx.scheduleOccurrence.create({data:{arenaId:arena.id,title:"Reserva da mesclagem",sourceType:"BOOKING",startsAt:new Date("2040-01-02T17:00:00Z"),endsAt:new Date("2040-01-02T18:00:00Z"),responsiblePlayerId:duplicate.id,participants:{create:{playerId:duplicate.id,amountCents:3000,checkedInAt:new Date()}}}});
      const debt = await tx.financialEntry.create({ data: { arenaId: arena.id, playerId: duplicate.id, type: "REVENUE", category: "Teste", description: "Histórico descartável", amountCents: 1000, status: "PARTIAL", source: "GRIPO_IMPORT", externalReference: `gripo-${suffix}` } });
      const settlement = await tx.financialSettlement.create({ data: { arenaId: arena.id, financialEntryId: debt.id, amountCents: 300, paymentMethod: "PIX", notes: "Baixa preservada" } });
      const original = await tx.financialEntry.create({ data: { arenaId: arena.id, playerId: primary.id, type: "REVENUE", category: "Teste", description: "Conta do principal", amountCents: 500 } });
      const exports: Record<string, any> = {};
      const source = readFileSync(new URL("../src/lib/actions/client-management.ts", import.meta.url), "utf8");
      const mocks: Record<string, unknown> = {
        "next/cache": { revalidatePath() {} },
        "@/lib/auth/guards": { requirePermission: async () => ({ arenaId: arena.id }) },
        "@/lib/phone": { normalizeBrazilianPhone: (value: string) => value },
        "@/lib/rls": { withArenaTransaction: async (_arenaId: string, callback: (client: typeof tx) => Promise<unknown>) => callback(tx) },
      };
      vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
        exports,
        require: (name: string) => name in mocks ? mocks[name] : nodeRequire(name),
      });
      const form = new FormData();
      form.set("primaryPlayerId", primary.id);
      form.set("duplicatePlayerId", duplicate.id);
      assert.equal((await exports.mergeClientsAction(form)).success, true);
      assert.equal((await tx.scheduleOccurrence.findUniqueOrThrow({where:{id:reservation.id}})).responsiblePlayerId,primary.id);
      assert.equal((await tx.scheduleParticipant.findFirstOrThrow({where:{occurrenceId:reservation.id}})).playerId,primary.id);
      assert.equal((await tx.scheduleParticipant.findFirstOrThrow({where:{occurrenceId:reservation.id}})).amountCents,3000);
      const transferred = await tx.financialEntry.findUniqueOrThrow({ where: { id: debt.id }, include: { settlements: true } });
      assert.equal(transferred.playerId, primary.id);
      assert.equal(transferred.amountCents, 1000);
      assert.equal(transferred.status, "PARTIAL");
      assert.equal(transferred.externalReference, debt.externalReference);
      assert.equal(transferred.settlements[0].id, settlement.id);
      assert.equal(transferred.settlements[0].amountCents, 300);
      assert.equal((await tx.financialEntry.findUniqueOrThrow({ where: { id: original.id } })).amountCents, 500);
      assert.equal(await tx.financialEntry.count({ where: { playerId: primary.id } }), 2);
      assert.equal(await tx.financialEntry.count({ where: { playerId: duplicate.id } }), 0);
      const kept = await tx.player.findUniqueOrThrow({ where: { id: primary.id } });
      assert.equal(kept.phone, duplicate.phone);
      assert.equal(kept.email, primary.email);
      assert.equal(kept.birthDate?.toISOString(), duplicate.birthDate?.toISOString());
      assert.equal((await tx.player.findUniqueOrThrow({ where: { id: duplicate.id } })).mergedIntoPlayerId, primary.id);
      assert.match((await exports.mergeClientsAction(form)).error, /ativos/);

      form.set("duplicatePlayerId", simple.id);
      await exports.mergeClientsAction(form);
      const merged = await tx.player.findUniqueOrThrow({ where: { id: simple.id } });
      assert.equal(merged.active, false);
      assert.equal(merged.mergedIntoPlayerId, primary.id);

      const [portalPrimary, portalDuplicate] = await Promise.all([
        tx.player.create({ data: { arenaId: arena.id, name: `Portal principal ${suffix}` } }),
        tx.player.create({ data: { arenaId: arena.id, name: `Portal duplicado ${suffix}` } }),
      ]);
      await Promise.all([
        tx.playerAccount.create({ data: { arenaId: arena.id, playerId: portalPrimary.id, phone: `11${suffix}01`, passwordHash: "hash fictício" } }),
        tx.playerAccount.create({ data: { arenaId: arena.id, playerId: portalDuplicate.id, phone: `11${suffix}02`, passwordHash: "hash fictício" } }),
      ]);
      form.set("primaryPlayerId", portalPrimary.id);
      form.set("duplicatePlayerId", portalDuplicate.id);
      assert.match((await exports.mergeClientsAction(form)).error, /acesso ao Portal/);
      assert.equal(await tx.playerAccount.count({ where: { playerId: { in: [portalPrimary.id, portalDuplicate.id] } } }), 2);
      assert.equal((await tx.player.findUniqueOrThrow({ where: { id: portalDuplicate.id } })).active, true);
      const protectedDebt = await tx.financialEntry.create({ data: { arenaId: arena.id, playerId: portalDuplicate.id, type: "REVENUE", category: "Teste", description: "Débito protegido", amountCents: 700 } });
      assert.match((await exports.mergeClientsAction(form)).error, /acesso ao Portal/);
      assert.equal((await tx.financialEntry.findUniqueOrThrow({ where: { id: protectedDebt.id } })).playerId, portalDuplicate.id);
      const studentPrimary=await tx.player.create({data:{arenaId:arena.id,name:`Aluno principal ${suffix}`,student:{create:{arenaId:arena.id,name:`Aluno principal ${suffix}`,remainingClasses:3,totalClasses:5}}},include:{student:true}});
      const studentDuplicate=await tx.player.create({data:{arenaId:arena.id,name:`Aluno duplicado ${suffix}`,student:{create:{arenaId:arena.id,name:`Aluno duplicado ${suffix}`,remainingClasses:8,totalClasses:9}}},include:{student:true}});
      const batch=await tx.lessonCreditBatch.create({data:{arenaId:arena.id,studentId:studentDuplicate.student!.id,sourceKey:`merge-${suffix}`,granted:9,remaining:8}});
      const lesson=await tx.lesson.create({data:{arenaId:arena.id,title:"Histórico de aula da mesclagem"}});
      const attendance=await tx.lessonAttendance.create({data:{lessonId:lesson.id,studentId:studentDuplicate.student!.id,creditBatchId:batch.id,status:"PRESENT"}});
      form.set("primaryPlayerId",studentPrimary.id);form.set("duplicatePlayerId",studentDuplicate.id);
      assert.equal((await exports.mergeClientsAction(form)).success,true);
      const combinedStudent=await tx.student.findUniqueOrThrow({where:{id:studentPrimary.student!.id}});
      assert.equal((await tx.lessonCreditBatch.findUniqueOrThrow({where:{id:batch.id}})).studentId,studentPrimary.student!.id);
      assert.equal((await tx.lessonAttendance.findUniqueOrThrow({where:{id:attendance.id}})).studentId,studentPrimary.student!.id);
      assert.equal((await tx.lessonAttendance.findUniqueOrThrow({where:{id:attendance.id}})).creditBatchId,batch.id);
      assert.equal(combinedStudent.remainingClasses,11);assert.equal(combinedStudent.totalClasses,14);
      const oldStudent=await tx.student.findUniqueOrThrow({where:{id:studentDuplicate.student!.id}});assert.equal(oldStudent.active,false);assert.equal(oldStudent.remainingClasses,0);
      assert.ok(await tx.auditEvent.findFirst({where:{arenaId:arena.id,action:"CLIENT_MERGED",entityId:studentPrimary.id}}));
      const collisionA=await tx.player.create({data:{arenaId:arena.id,name:`Colisão A ${suffix}`}});
      const collisionB=await tx.player.create({data:{arenaId:arena.id,name:`Colisão B ${suffix}`}});
      const collisionReservation=await tx.scheduleOccurrence.create({data:{arenaId:arena.id,title:"Jogo de sexta",sourceType:"BOOKING",startsAt:new Date("2040-01-06T17:00:00Z"),endsAt:new Date("2040-01-06T18:00:00Z"),participants:{create:[{playerId:collisionA.id,amountCents:500},{playerId:collisionB.id,amountCents:700}]}}});
      form.set("primaryPlayerId",collisionA.id);form.set("duplicatePlayerId",collisionB.id);
      const conflict=await exports.mergeClientsAction(form);
      assert.match(conflict.error,/mesma reserva/);assert.match(conflict.error,/Jogo de sexta/);
      assert.equal(await tx.scheduleParticipant.count({where:{occurrenceId:collisionReservation.id}}),2);
      assert.equal((await tx.player.findUniqueOrThrow({where:{id:collisionB.id}})).active,true);
      const foreign = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
      const foreignPlayer = await tx.player.create({ data: { arenaId: foreign.id, name: "Outro tenant descartável" } });
      form.set("duplicatePlayerId", foreignPlayer.id);
      assert.match((await exports.mergeClientsAction(form)).error, /nesta arena/);
      assert.equal((await tx.player.findUniqueOrThrow({ where: { id: foreignPlayer.id } })).active, true);
      throw rollback;
    }, {timeout:60000}), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
