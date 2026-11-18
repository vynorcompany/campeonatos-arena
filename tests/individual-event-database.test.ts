import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { PrismaClient } from "@prisma/client";

const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const enabled = /^postgresql:\/\/[^@]+@127\.0\.0\.1:55433\/arena_goal\?/.test(url);
test("individual day-use public/manual registration, pricing, payment and tenant/history guards", { skip: !enabled, timeout: 120000 }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const arenas: string[] = [], require = createRequire(import.meta.url), cache = new Map<string, any>();
  const payments: any[] = [];
  let arenaId = "";
  const scope = (id: string, callback: any) => runtime.$transaction(async tx => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${id}, true)`; return callback(tx); });
  function load(file: string): any {
    const absolute = path.resolve(file); if (cache.has(absolute)) return cache.get(absolute);
    const exports = {}; cache.set(absolute, exports);
    vm.runInNewContext(ts.transpileModule(readFileSync(absolute, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
      exports, console, process, FormData, Date, Error,
      require(name: string) {
        if (name === "server-only" || name === "next/cache") return { revalidatePath() {} };
        if (name === "@/lib/auth/guards") return { requirePermission: async () => ({ arenaId }) };
        if (name === "@/lib/tournament/revalidation") return { refreshTournamentRoutes() {} };
        if (name === "@/lib/env") return { env: { appUrl: "http://localhost:3011" } };
        if (name === "@/lib/payments/mercado-pago") return { createPixPayment: async (input: any) => { payments.push(input); return { provider: "MERCADO_PAGO", reference: "qa-payment", paymentId: "qa-payment", qrCode: "qa-only", qrCodeBase64: "", checkoutUrl: "", expiresAt: null }; } };
        if (name === "@/lib/prisma") return { prisma: runtime };
        if (name === "@/lib/rls") return { setArenaRlsContext: (tx: any, id: string) => tx.$executeRaw`SELECT set_config('app.arena_id', ${id}, true)`, withArenaTransaction: scope };
        if (name.startsWith("@/")) return load("src/" + name.slice(2) + ".ts");
        return require(name);
      },
    }, { filename: absolute }); return exports;
  }
  const data = (values: Record<string, string>) => { const form = new FormData(); for (const [key, value] of Object.entries(values)) form.set(key, value); return form; };
  try {
    for (let i = 0; i < 2; i++) arenas.push((await admin.arena.create({ data: { name: "Individual QA", slug: "individual-qa-" + randomUUID(), createdById: "goal-test" } })).id);
    arenaId = arenas[0];
    const tournament = await admin.tournament.create({ data: { arenaId, name: "Day use QA", creationMode: "PUBLIC" } });
    const category = await admin.tournamentCategory.create({ data: { tournamentId: tournament.id, name: "Day use", level: 1, registrationType: "INDIVIDUAL", priceFirstCents: 8000, priceSecondCents: 6000, priceThirdCents: 4000 } });
    const free = await admin.tournamentCategory.create({ data: { tournamentId: tournament.id, name: "Day use gratuito", level: 2, registrationType: "INDIVIDUAL" } });
    const bank = await admin.bankAccount.create({ data: { arenaId, name: "Individual QA", active: true } });
    await admin.arenaOperationalSettings.upsert({ where: { arenaId }, create: { arenaId, portalPaymentBankAccountId: bank.id }, update: { portalPaymentBankAccountId: bank.id } });
    const { createPublicRegistrationAction } = load("src/lib/actions/public-registration.ts");
    const fields = { tournamentSlug: tournament.publicSlug, categoryId: category.id, registrationType: "INDIVIDUAL", leadName: "Atleta Individual", leadEmail: "individual@example.test", leadPhone: "42999990000", leadCpf: "11111111111", paymentMethod: "PIX" };
    const paid = await createPublicRegistrationAction({}, data(fields));
    assert.equal(paid.error, null); assert.equal(paid.amountCents, 8000); assert.equal(payments[0].amountCents, 8000);
    const registration = await admin.publicTournamentRegistration.findUniqueOrThrow({ where: { id: paid.registrationId } });
    assert.equal(registration.partnerCpf, ""); assert.equal(registration.partnerName, ""); assert.equal(registration.competitionId, null); assert.equal(registration.status, "PENDING_PAYMENT");
    assert.match((await createPublicRegistrationAction({}, data(fields))).error, /já está inscrito/);
    assert.match((await createPublicRegistrationAction({}, data({ ...fields, registrationType: "PAIR", partnerName: "Outro Atleta", partnerCpf: "22222222222", partnerPhone: "42999990001" }))).error, /tipo de inscrição/);
    const confirmed = await createPublicRegistrationAction({}, data({ ...fields, categoryId: free.id }));
    assert.equal(confirmed.error, null); assert.equal(confirmed.amountCents, 0);
    assert.equal((await admin.publicTournamentRegistration.findUniqueOrThrow({ where: { id: confirmed.registrationId } })).status, "CONFIRMED");
    assert.equal(await admin.pair.count({ where: { tournamentId: tournament.id } }), 0);
    assert.equal(await admin.categoryCompetition.count({ where: { categoryId: free.id } }), 0);
    const athlete = await admin.player.create({ data: { arenaId, name: "Manual Individual", cpf: "33333333333", phone: "42999990003" } });
    const { createManualTournamentRegistrationAction } = load("src/lib/actions/tournament/registrations.ts");
    const manual = await createManualTournamentRegistrationAction({}, data({ tournamentId: tournament.id, categoryId: category.id, registrationType: "INDIVIDUAL", leadPlayerId: athlete.id, amountReais: "80,00", bankAccountId: bank.id, paymentStatus: "PAID" }));
    assert.equal(manual.error, null);
    const receipt = await admin.financialEntry.findFirstOrThrow({ where: { arenaId, source: "TOURNAMENT_REGISTRATION", playerId: athlete.id, status: "PAID" } });
    assert.equal(receipt.amountCents, 8000); assert.equal(receipt.counterpartyName, athlete.name);
    const pendingAthlete = await admin.player.create({ data: { arenaId, name: "Pendente Individual", cpf: "44444444444", phone: "42999990004" } });
    const pending = await createManualTournamentRegistrationAction({}, data({ tournamentId: tournament.id, categoryId: category.id, registrationType: "INDIVIDUAL", leadPlayerId: pendingAthlete.id, amountReais: "60,00", paymentStatus: "PENDING" }));
    assert.equal(pending.error, null);
    const pendingRegistration = await admin.publicTournamentRegistration.findFirstOrThrow({ where: { categoryId: category.id, leadCpf: pendingAthlete.cpf } });
    const { updateTournamentRegistrationAction } = load("src/lib/actions/tournament/registrations.ts");
    const edited = await updateTournamentRegistrationAction({}, data({ registrationId: pendingRegistration.id, tournamentId: tournament.id, categoryId: category.id, registrationType: "INDIVIDUAL", leadName: pendingAthlete.name, leadCpf: pendingAthlete.cpf, leadPhone: pendingAthlete.phone, amountReais: "65,00", paymentStatus: "PAID", bankAccountId: bank.id }));
    assert.equal(edited.error, null);
    assert.equal((await admin.publicTournamentRegistration.findUniqueOrThrow({ where: { id: pendingRegistration.id } })).amountCents, 6500);
    assert.equal(await admin.financialEntry.count({ where: { arenaId, externalReference: pendingRegistration.id } }), 1);
    assert.equal(await admin.pair.count({ where: { tournamentId: tournament.id } }), 0);
    await assert.rejects(scope(arenaId, (tx: any) => tx.categoryCompetition.create({ data: { categoryId: category.id, format: "SIMPLE" } })), /não possuem jogos/);
    await assert.rejects(scope(arenaId, (tx: any) => tx.categoryBracket.create({ data: { tournamentId: tournament.id, categoryId: category.id } })), /não possuem jogos/);
    await assert.rejects(scope(arenaId, (tx: any) => tx.tournamentCategory.update({ where: { id: category.id }, data: { registrationType: "PAIR" } })), /já possui inscrições/);
    await assert.rejects(scope(arenaId, (tx: any) => tx.publicTournamentRegistration.update({ where: { id: registration.id }, data: { partnerName: "Intruso Atleta" } })), /somente um participante/);
    assert.equal(await scope(arenas[1], (tx: any) => tx.publicTournamentRegistration.count({ where: { tournamentId: tournament.id } })), 0);
    const { archiveTournamentCategory } = load("src/lib/tournaments/category-removal.ts");
    const lateAthlete = await admin.player.create({ data: { arenaId, name: "Acerto Após Remoção", cpf: "77777777777", phone: "42999990007" } });
    const latePending = await createManualTournamentRegistrationAction({}, data({ tournamentId: tournament.id, categoryId: category.id, registrationType: "INDIVIDUAL", leadPlayerId: lateAthlete.id, amountReais: "80,00", paymentStatus: "PENDING" }));
    assert.equal(latePending.error, null);
    const lateRegistration = await admin.publicTournamentRegistration.findFirstOrThrow({ where: { categoryId: category.id, leadCpf: lateAthlete.cpf } });
    const count = await admin.publicTournamentRegistration.count({ where: { categoryId: category.id } });
    const removal = { arenaId, tournamentId: tournament.id, categoryId: category.id, expectedRegistrationCount: count, confirmed: true, actorId: "goal-test", actorName: "Operador QA" };
    assert.equal((await scope(arenaId, (tx: any) => archiveTournamentCategory(tx, { ...removal, confirmed: false }))).ok, false);
    assert.equal((await scope(arenaId, (tx: any) => archiveTournamentCategory(tx, { ...removal, expectedRegistrationCount: count - 1 }))).ok, false);
    await assert.rejects(scope(arenas[1], (tx: any) => archiveTournamentCategory(tx, { ...removal, arenaId: arenas[1] })), /não encontrado nesta arena/);
    const receiptsBefore = await admin.financialEntry.count({ where: { arenaId } });
    assert.equal((await scope(arenaId, (tx: any) => archiveTournamentCategory(tx, removal))).ok, true);
    assert.equal((await scope(arenaId, (tx: any) => archiveTournamentCategory(tx, removal))).ok, true);
    const archived = await admin.tournamentCategory.findUniqueOrThrow({ where: { id: category.id } });
    assert.ok(archived.archivedAt); assert.equal(archived.active, false);
    assert.equal(await admin.publicTournamentRegistration.count({ where: { categoryId: category.id } }), count);
    assert.equal(await admin.financialEntry.count({ where: { arenaId } }), receiptsBefore);
    assert.equal(await admin.auditEvent.count({ where: { arenaId, entityId: category.id, action: "TOURNAMENT_CATEGORY_REMOVED" } }), 1);
    const reconciled = await updateTournamentRegistrationAction({}, data({ registrationId: lateRegistration.id, tournamentId: tournament.id, categoryId: category.id, registrationType: "INDIVIDUAL", leadName: lateAthlete.name, leadCpf: lateAthlete.cpf, leadPhone: lateAthlete.phone, amountReais: "80,00", paymentStatus: "PAID", bankAccountId: bank.id }));
    assert.equal(reconciled.error, null);
    assert.equal(await admin.financialEntry.count({ where: { arenaId, externalReference: lateRegistration.id } }), 1);
    assert.equal(await admin.pair.count({ where: { tournamentId: tournament.id } }), 0);

    assert.match((await createPublicRegistrationAction({}, data({ ...fields, leadCpf: "55555555555" }))).error, /Categoria inv/);
    await assert.rejects(scope(arenaId, (tx: any) => tx.tournamentCategory.update({ where: { id: category.id }, data: { active: true } })), /archived_inactive/);
    await assert.rejects(scope(arenaId, (tx: any) => tx.publicTournamentRegistration.create({ data: { tournamentId: tournament.id, categoryId: category.id, registrationOrder: 10, leadName: "Novo Atleta", leadPhone: "42999990005", leadCpf: "55555555555", partnerName: "", partnerPhone: "", partnerCpf: "", amountCents: 0 } })), /removida/);
    const historyCategory = await admin.tournamentCategory.create({ data: { tournamentId: tournament.id, name: "Duplas com histórico", level: 3 } });
    const competition = await admin.categoryCompetition.create({ data: { categoryId: historyCategory.id, format: "SIMPLE" } });
    const home = await admin.categoryPair.create({ data: { competitionId: competition.id, name: "Dupla QA A", drawOrder: 1 } });
    const away = await admin.categoryPair.create({ data: { competitionId: competition.id, name: "Dupla QA B", drawOrder: 2 } });
    const match = await admin.categoryMatch.create({ data: { competitionId: competition.id, label: "Final QA", stage: "FINAL", roundOrder: 1, homePairId: home.id, awayPairId: away.id, winnerPairId: home.id, homeScore: 6, awayScore: 4 } });
    assert.equal((await scope(arenaId, (tx: any) => archiveTournamentCategory(tx, { ...removal, categoryId: historyCategory.id, expectedRegistrationCount: 0 }))).ok, true);
    const preserved = await admin.categoryMatch.findUniqueOrThrow({ where: { id: match.id } });
    assert.equal(preserved.homeScore, 6); assert.equal(preserved.awayScore, 4); assert.equal(preserved.winnerPairId, home.id);

  } finally {
    for (const id of arenas) { await admin.financialEntry.deleteMany({ where: { arenaId: id } }); await admin.tournament.deleteMany({ where: { arenaId: id } }); await admin.player.deleteMany({ where: { arenaId: id } }); await admin.arenaOperationalSettings.deleteMany({ where: { arenaId: id } }); await admin.bankAccount.deleteMany({ where: { arenaId: id } }); await admin.auditEvent.deleteMany({ where: { arenaId: id } }); await admin.arena.deleteMany({ where: { id } }); }
    await runtime.$disconnect(); await admin.$disconnect();
  }
});
