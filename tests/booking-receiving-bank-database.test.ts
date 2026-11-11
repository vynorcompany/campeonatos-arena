import * as reservationCredits from "../src/lib/plans/reservation-credits";
import { withDatabaseModuleMocks } from "./helpers/client-module-mocks";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { z as requireZod } from "zod";
import { PrismaClient, type Prisma } from "@prisma/client";
import { arenaDatabaseForTest } from "./helpers/arena-database";
import * as inputs from "../src/lib/calendar/inputs";
import * as resources from "../src/lib/calendar/booking-services";
import * as holds from "../src/lib/calendar/online-booking-hold";
import { isFixedBookingType } from "../src/lib/calendar/booking-types";
import { assertCourtBookingMayBeEdited } from "../src/lib/calendar/court-booking-edit-safety";
import { expandWeeklyOccurrences } from "../src/lib/scheduling/recurrence";
import { requireReceivingBankAccount } from "../src/lib/finance/receiving-bank-account";

const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const local = /^postgresql:\/\/postgres@127\.0\.0\.1:55433\/arena_goal(?:\?|$)/.test(url);
test("Grade exige conta ativa por recebimento, preserva reservas em aberto e cobra apenas o primeiro horário da série", { skip: !local }, async () => {
  const admin = new PrismaClient({ datasources: { db: { url } } });
  const runtimeUrl = new URL(url); runtimeUrl.username = "arena_runtime";
  const runtime = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
  const arenas: string[] = [];
  const suffix = randomUUID();
  let canSettle = true;
  try {
    for (const label of ["a", "b"]) arenas.push((await admin.arena.create({ data: { name: `Recebimento grade ${label}`, slug: `grade-bancos-${label}-${suffix}`, createdById: "goal-test" } })).id);
    const [arenaId, foreignId] = arenas;
    const court = await admin.court.create({ data: { arenaId, name: "Quadra de teste" } });
    const players = await Promise.all(["A", "B"].map(name => admin.player.create({ data: { arenaId, name: `Atleta ${name}` } })));
    const bankA = await admin.bankAccount.create({ data: { arenaId, name: "Conta A" } });
    const bankB = await admin.bankAccount.create({ data: { arenaId, name: "Conta B" } });
    const inactive = await admin.bankAccount.create({ data: { arenaId, name: "Conta inativa", active: false } });
    const foreign = await admin.bankAccount.create({ data: { arenaId: foreignId, name: "Conta de outra arena" } });
    const scope = <T>(id: string, fn: (tx: Prisma.TransactionClient) => Promise<T>) => runtime.$transaction(async tx => { await tx.$executeRaw`SELECT set_config('app.arena_id', ${id}, true)`; return fn(tx); });
    const actions: Record<string, (data: FormData) => Promise<{ error?: string }>> = {};
    const mocks: Record<string, unknown> = {
      "@/lib/auth/guards": { requirePermission: async (permission: string) => { if (permission === "finance:receivable:settle" && !canSettle) throw new Error("Sem permissão financeira."); return { arenaId, userId: "goal-test", userName: "Operador GOAL" }; } },
      "@/lib/arena-database": { arenaDatabase: (id: string) => arenaDatabaseForTest(runtime, id) },
      "@/lib/rls": { withArenaTransaction: scope },
      "@/lib/calendar/inputs": inputs,
      "@/lib/plans/reservation-credits": reservationCredits,
      "@/lib/calendar/booking-services": resources,
      "@/lib/calendar/booking-types": { isFixedBookingType },
      "@/lib/calendar/court-booking-edit-safety": { assertCourtBookingMayBeEdited },
      "@/lib/calendar/online-booking-hold": holds,
      "@/lib/scheduling/recurrence": { expandWeeklyOccurrences },
      "@/lib/finance/receiving-bank-account": { requireReceivingBankAccount },
      "@/lib/calendar/revalidation": { refreshCalendarRoutes() {} },
      "@/lib/finance/revalidation": { refreshFinanceRoutes() {} },
    };
    vm.runInNewContext(ts.transpileModule(readFileSync(new URL("../src/lib/actions/calendar.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports: actions, FormData, Date, Error, console: { error() {} }, require: withDatabaseModuleMocks((name: string) => mocks[name] ?? (name === "zod" ? { z: requireZod } : {})) });
    const payer = (index: number, bankAccountId = "", paymentMethod = "PIX") => ({ playerId: players[index].id, amountCents: 6000, paymentMethod, bankAccountId });
    const form = async (participants: ReturnType<typeof payer>[], date = "2040-01-02", extra: Record<string, string> = {}) => {
      const data = new FormData();
      for (const [key, value] of Object.entries({ occurrenceId: "", courtId: court.id, courtIds: JSON.stringify([court.id]), title: "Reserva QA", startsAt: `${date}T10:00`, durationMinutes: "60", bookingTypeName: "Reserva", repeatUntil: "", teacherId: "", responsiblePlayerId: players[0].id, notes: "", participants: JSON.stringify(participants), ...extra })) data.set(key, value);
      if (extra.occurrenceId) data.set("expectedUpdatedAt", (await admin.scheduleOccurrence.findUniqueOrThrow({where:{id:extra.occurrenceId}})).updatedAt.toISOString());
      return data;
    };
    for (const bank of ["", inactive.id, foreign.id]) assert.match((await actions.saveCourtBookingAction(await form([payer(0, bank)]))).error ?? "", /conta bancária/);
    assert.equal(await admin.scheduleOccurrence.count({ where: { arenaId } }), 0);
    assert.equal(await admin.financialEntry.count({ where: { arenaId } }), 0);
    canSettle = false;
    assert.ok((await actions.saveCourtBookingAction(await form([payer(0, bankA.id)]))).error);
    assert.equal(await admin.scheduleOccurrence.count({ where: { arenaId } }), 0);
    canSettle = true;
    assert.equal((await actions.saveCourtBookingAction(await form([payer(0, bankA.id), payer(1, bankB.id)]))).error, undefined);
    const paid = await admin.financialEntry.findMany({ where: { arenaId }, include: { settlements: true }, orderBy: { playerId: "asc" } });
    assert.equal(paid.length, 2);
    for (const [index, player] of players.entries()) {
      const entry = paid.find(row => row.playerId === player.id)!;
      assert.equal(entry.status, "PAID"); assert.equal(entry.bankAccountId, index === 0 ? bankA.id : bankB.id);
      assert.equal(entry.settlements.length, 1); assert.equal(entry.settlements[0].bankAccountId, entry.bankAccountId);
      assert.equal(entry.settlements[0].amountCents, 6000);
    }
    const occurrence = await admin.scheduleOccurrence.findFirstOrThrow({ where: { arenaId } });
    const creation = await admin.auditEvent.findFirstOrThrow({ where: { arenaId, entityId: occurrence.id, action: "booking.created" } });
    assert.equal(creation.actorId, "goal-test");
    assert.equal(creation.actorName, "Operador GOAL");
    assert.equal((await actions.saveCourtBookingAction(await form([payer(0, bankA.id),payer(1,bankB.id)], "2040-01-02", { occurrenceId: occurrence.id }))).error, undefined);
    assert.equal(await admin.auditEvent.count({ where: { arenaId, entityId: occurrence.id, action: "booking.created" } }), 1, "edits preserve the original creation record");
    assert.equal(await admin.financialSettlement.count({where:{arenaId}}),2,"saving paid athletes does not create another receipt");
    assert.equal((await actions.saveCourtBookingAction(await form([payer(0,bankA.id)],"2040-01-02",{occurrenceId:occurrence.id}))).error,undefined);
    assert.equal((await admin.financialEntry.findUniqueOrThrow({where:{id:paid.find(e=>e.playerId===players[1].id)!.id}})).status,"PAID","removed paid athlete keeps the original entry");
    assert.equal(await admin.financialSettlement.count({ where: { arenaId } }), 2);
    canSettle = false;
    assert.equal((await actions.saveCourtBookingAction(await form([payer(0, "", "")], "2040-01-03"))).error, undefined);
    canSettle = true;
    const openBooking=await admin.scheduleOccurrence.findFirstOrThrow({where:{arenaId,startsAt:new Date("2040-01-03T10:00:00")},include:{participants:true}});
    const openId=openBooking.participants[0].financialEntryId!;
    assert.equal((await actions.saveCourtBookingAction(await form([payer(1,"","")],"2040-01-03",{occurrenceId:openBooking.id,responsiblePlayerId:players[1].id}))).error,undefined);
    assert.equal((await admin.financialEntry.findUniqueOrThrow({where:{id:openId}})).status,"VOIDED","unpaid removed athlete is voided, not deleted");
    assert.equal((await actions.saveCourtBookingAction(await form([payer(0, bankA.id)], "2040-01-07", { bookingTypeName: "Reserva fixa", repeatUntil: "2040-01-21" }))).error, undefined);
    const unallocated = [{...payer(0,"",""),amountCents:0}];
    assert.equal((await actions.saveCourtBookingAction(await form(unallocated,"2040-02-01",{courtPriceCents:"18000"}))).error,undefined);
    const priced=await admin.scheduleOccurrence.findFirstOrThrow({where:{arenaId,startsAt:new Date("2040-02-01T10:00:00")},include:{participants:true}});
    assert.equal(priced.courtPriceCents,18000);assert.equal(priced.participants[0].amountCents,0,"saving the court price does not automatically charge athletes");
    assert.equal((await actions.saveCourtBookingAction(await form(unallocated,"2040-02-01",{occurrenceId:priced.id,courtPriceCents:"0"}))).error,undefined);
    assert.equal((await admin.scheduleOccurrence.findUniqueOrThrow({where:{id:priced.id}})).courtPriceCents,0,"an explicit free booking remains free");
    const series = await admin.scheduleOccurrence.findMany({ where: { arenaId, bookingSeriesId: { not: null } }, orderBy: { startsAt: "asc" }, include: { participants: { include: { financialEntry: { include: { settlements: true } } } } } });
    assert.equal(series.length, 3);
    assert.equal(series[0].participants[0].financialEntry!.bankAccountId, bankA.id);
    assert.equal(series[0].participants[0].financialEntry!.settlements.length, 1);
    for (const future of series.slice(1)) { assert.equal(future.participants[0].financialEntry!.status, "PENDING"); assert.equal(future.participants[0].financialEntry!.settlements.length, 0); }
    // A fully paid monthly plan is the grant; pending/partial and foreign entries are not.
    const creditSeries = await admin.scheduleBookingSeries.create({data:{arenaId,title:"Plano QA",bookingTypeName:"Reserva fixa",responsiblePlayerId:players[1].id,startsAt:new Date("2040-02-06T10:00:00Z"),endsAt:new Date("2040-02-28T11:00:00Z")}});
    await admin.scheduleOccurrence.create({data:{arenaId,bookingSeriesId:creditSeries.id,sourceType:"BOOKING",title:"Plano QA",bookingTypeName:"Reserva fixa",startsAt:new Date("2040-02-06T10:00:00Z"),endsAt:new Date("2040-02-06T11:00:00Z")}});
    const grant = await admin.financialEntry.create({data:{arenaId,playerId:players[1].id,source:"FIXED_COURT_PLAN",externalReference:creditSeries.id,type:"REVENUE",category:"Planos de quadra",description:"Mensalidade QA",amountCents:40000,status:"PENDING",competenceDate:new Date("2040-02-01T12:00:00Z"),notes:"Reserva fixa; 1 ocorrências no mês."}});
    assert.equal((await scope(arenaId,tx=>reservationCredits.reservationCreditBalances(tx,arenaId,[players[1].id]))).get(players[1].id)??0,0);
    const creditPayer = {...payer(1,"","RESERVATION_CREDIT"), amountCents:6000};
    const creditForm = (date:string,extra:Record<string,string>={})=>form([creditPayer],date,{responsiblePlayerId:players[1].id,...extra});
    assert.match((await actions.saveCourtBookingAction(await creditForm("2040-03-04"))).error??"",/Sem crédito de reserva/);
    await admin.financialEntry.update({where:{id:grant.id},data:{status:"PAID",paidAt:new Date()}});
    assert.equal((await scope(arenaId,tx=>reservationCredits.reservationCreditBalances(tx,arenaId,[players[1].id]))).get(players[1].id),1);
    assert.equal((await actions.saveCourtBookingAction(await creditForm("2040-03-04"))).error,undefined);
    const creditBooking = await admin.scheduleOccurrence.findFirstOrThrow({where:{arenaId,startsAt:new Date("2040-03-04T10:00:00")},include:{participants:{include:{financialEntry:{include:{settlements:true}}}}}});
    const creditEntry=creditBooking.participants[0].financialEntry!;
    assert.equal(creditEntry.status,"PAID");assert.equal(creditEntry.paymentMethod,"RESERVATION_CREDIT");assert.equal(creditEntry.bankAccountId,null);assert.equal(creditEntry.settlements[0].paymentMethod,"RESERVATION_CREDIT");
    assert.equal((await actions.saveCourtBookingAction(await creditForm("2040-03-04",{occurrenceId:creditBooking.id}))).error,undefined);
    assert.equal(await admin.clientBalanceMovement.count({where:{arenaId,playerId:players[1].id,kind:"RESERVATION"}}),1,"saving twice never debits twice");
    assert.match((await actions.saveCourtBookingAction(await creditForm("2040-03-05"))).error??"",/Sem crédito de reserva/);
    assert.equal((await scope(foreignId,tx=>reservationCredits.reservationCreditBalances(tx,foreignId,[players[1].id]))).get(players[1].id)??0,0);
    assert.match((await actions.saveCourtBookingAction(await form([creditPayer],"2040-03-04",{responsiblePlayerId:players[1].id,occurrenceId:creditBooking.id,durationMinutes:"90"}))).error??"",/Sem crédito de reserva/);
    // Concurrent redemption is serialized on the player, even for distinct bookings.
    await admin.financialEntry.update({where:{id:grant.id},data:{notes:"Reserva fixa; 2 ocorrências no mês."}});
    const concurrent = await Promise.allSettled(["concurrent-a","concurrent-b"].map(id=>scope(arenaId,tx=>reservationCredits.redeemReservationCredit(tx,arenaId,players[1].id,id,60))));
    assert.equal(concurrent.filter(r=>r.status==="fulfilled").length,1);
    assert.equal(await admin.clientBalanceMovement.count({where:{arenaId,playerId:players[1].id,kind:"RESERVATION"}}),2);
    await admin.financialEntry.update({where:{id:grant.id},data:{notes:"Reserva fixa; 3 ocorrências no mês."}});
    assert.equal((await actions.saveCourtBookingAction(await form([{...creditPayer,amountCents:0}],"2040-03-06",{responsiblePlayerId:players[1].id}))).error,undefined);
    const zeroCredit = await admin.scheduleOccurrence.findFirstOrThrow({where:{arenaId,startsAt:new Date("2040-03-06T10:00:00")},include:{participants:{include:{financialEntry:true}}}});
    assert.equal(zeroCredit.participants[0].financialEntry!.status,"PAID");
    assert.equal(await admin.clientBalanceMovement.count({where:{arenaId,playerId:players[1].id,kind:"RESERVATION"}}),3);
  } finally {
    await admin.scheduleOccurrence.deleteMany({ where: { arenaId: { in: arenas } } });
    await admin.financialEntry.deleteMany({ where: { arenaId: { in: arenas } } });
    await admin.arena.deleteMany({ where: { id: { in: arenas } } });
    await runtime.$disconnect(); await admin.$disconnect();
  }
});
