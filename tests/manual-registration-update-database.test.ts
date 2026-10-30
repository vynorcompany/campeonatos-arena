import assert from "node:assert/strict";
import test from "node:test";
import { PrismaClient } from "@prisma/client";
import { updateManualTournamentRegistration } from "../src/lib/tournaments/manual-registration-update";

const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try { const url = new URL(testUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal"; }
  catch { return false; }
})();

test("edição da inscrição valida arena/categoria e confirma a dupla na mesma transação", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const rollback = new Error("rollback da edição de inscrição de teste");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const arenaA = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
      const arenaB = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
      const unique = Date.now();
      const tournamentA = await tx.tournament.create({ data: { arenaId: arenaA.id, name: "Torneio edição GOAL", publicSlug: `goal-edit-a-${unique}` } });
      const tournamentB = await tx.tournament.create({ data: { arenaId: arenaB.id, name: "Outro torneio GOAL", publicSlug: `goal-edit-b-${unique}` } });
      const categoryA = await tx.tournamentCategory.create({ data: { tournamentId: tournamentA.id, name: "Categoria A", level: 1 } });
      const categoryB = await tx.tournamentCategory.create({ data: { tournamentId: tournamentB.id, name: "Categoria B", level: 1 } });
      const registration = await tx.publicTournamentRegistration.create({ data: {
        tournamentId: tournamentA.id, categoryId: categoryA.id, registrationOrder: 1,
        leadName: "Atleta Edição Um", leadPhone: "559999999999", leadCpf: "11111111111", leadBirthDate: new Date("1990-01-01"),
        partnerName: "Atleta Edição Dois", partnerPhone: "558888888888", partnerCpf: "22222222222", partnerBirthDate: new Date("1991-01-01"),
        amountCents: 15000, paymentStatus: "PENDING", status: "PENDING_PAYMENT", paymentProvider: "MANUAL",
      } });
      const input = {
        arenaId: arenaA.id, tournamentId: tournamentA.id, registrationId: registration.id, categoryId: categoryA.id,
        leadName: registration.leadName, leadPhone: registration.leadPhone, leadCpf: registration.leadCpf, leadBirthDate: registration.leadBirthDate,
        partnerName: registration.partnerName, partnerPhone: registration.partnerPhone, partnerCpf: registration.partnerCpf, partnerBirthDate: registration.partnerBirthDate,
        amountCents: registration.amountCents, paymentStatus: "PAID" as const,
      };

      assert.equal((await updateManualTournamentRegistration(tx, { ...input, arenaId: arenaB.id })).ok, false);
      assert.equal((await updateManualTournamentRegistration(tx, { ...input, categoryId: categoryB.id })).ok, false);
      assert.equal((await tx.publicTournamentRegistration.findUniqueOrThrow({ where: { id: registration.id } })).paymentStatus, "PENDING");
      assert.equal((await updateManualTournamentRegistration(tx, input)).ok, false);
      assert.equal(await tx.financialEntry.count({where:{arenaId:arenaA.id,externalReference:registration.id}}),0);
      const bank = await tx.bankAccount.create({data:{arenaId:arenaA.id,name:`Conta inscrição ${unique}`}});
      const foreignBank = await tx.bankAccount.create({data:{arenaId:arenaB.id,name:`Conta inscrição ${unique}`}});
      const inactiveBank = await tx.bankAccount.create({data:{arenaId:arenaA.id,name:`Conta inativa ${unique}`,active:false}});
      for (const bankAccountId of [foreignBank.id,inactiveBank.id]) assert.equal((await updateManualTournamentRegistration(tx,{...input,bankAccountId})).ok,false);
      assert.equal((await tx.publicTournamentRegistration.findUniqueOrThrow({where:{id:registration.id}})).paymentStatus,"PENDING");
      assert.equal((await updateManualTournamentRegistration(tx, {...input,bankAccountId:bank.id})).ok, true);
      const receipt=await tx.financialEntry.findFirstOrThrow({where:{arenaId:arenaA.id,externalReference:registration.id},include:{settlements:true}});
      assert.equal(receipt.bankAccountId,bank.id);assert.equal(receipt.amountCents,15000);assert.equal(receipt.status,"PAID");
      assert.equal(receipt.settlements.length,1);assert.equal(receipt.settlements[0].bankAccountId,bank.id);

      const confirmed = await tx.publicTournamentRegistration.findUniqueOrThrow({ where: { id: registration.id } });
      assert.equal(confirmed.status, "CONFIRMED");
      assert.equal(confirmed.paymentStatus, "PAID");
      assert.equal(confirmed.categoryId, categoryA.id);
      assert.equal(await tx.tournamentPlayer.count({ where: { tournamentId: tournamentA.id } }), 2);
      assert.equal(await tx.pair.count({ where: { tournamentId: tournamentA.id } }), 1);
      assert.equal((await updateManualTournamentRegistration(tx, { ...input, paymentStatus: "PENDING" })).ok, false);
      assert.equal((await updateManualTournamentRegistration(tx, { ...input, leadName: "Outra dupla" })).ok, false);
      assert.equal(await tx.pair.count({ where: { tournamentId: tournamentA.id } }), 1);
      assert.equal(await tx.financialEntry.count({where:{arenaId:arenaA.id,externalReference:registration.id}}),1);
      assert.equal((await tx.publicTournamentRegistration.findUniqueOrThrow({ where: { id: registration.id } })).leadName, registration.leadName);

      const online = await tx.publicTournamentRegistration.create({ data: {
        tournamentId: tournamentA.id, categoryId: categoryA.id, registrationOrder: 2,
        leadName: "Atleta Online Um", leadPhone: "557777777777", leadCpf: "33333333333", leadBirthDate: new Date("1992-01-01"),
        partnerName: "Atleta Online Dois", partnerPhone: "556666666666", partnerCpf: "44444444444", partnerBirthDate: new Date("1993-01-01"),
        amountCents: 15000, paymentStatus: "PENDING", status: "PENDING_PAYMENT", paymentProvider: "PIX", mercadoPagoPaymentId: "payment-goal",
      } });
      const attemptedOnlineEdit = await updateManualTournamentRegistration(tx, { ...input, registrationId: online.id, leadName: "Nome modificado", paymentStatus: "PAID" });
      assert.equal(attemptedOnlineEdit.ok, false);
      const unchangedOnline = await tx.publicTournamentRegistration.findUniqueOrThrow({ where: { id: online.id } });
      assert.equal(unchangedOnline.paymentStatus, "PENDING");
      assert.equal(unchangedOnline.leadName, "Atleta Online Um");
      assert.equal(await tx.pair.count({ where: { tournamentId: tournamentA.id } }), 1);
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
