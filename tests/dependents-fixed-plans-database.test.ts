import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { randomUUID } from "node:crypto";
import { reservationCreditGrants } from "../src/lib/plans/reservation-credits";
import {z} from "zod";
import { availableFixedTimes, fixedMonthAmount, fixedCycle, fixedSchedules } from "../src/lib/plans/fixed-court";
import { requireReceivingBankAccount } from "../src/lib/finance/receiving-bank-account";
import {portalCheckoutPolicy} from "../src/lib/payments/portal-checkout-policy";
import ts from "typescript";
import { PrismaClient, Prisma } from "@prisma/client";
import { withDatabaseModuleMocks } from "./helpers/client-module-mocks";
import { validateGuardian } from "../src/lib/clients/dependents";
import { expandWeeklyOccurrences } from "../src/lib/scheduling/recurrence";
import { activeCourtOccurrenceWhere } from "../src/lib/calendar/online-booking-hold";
import { settlementSchema } from "../src/lib/finance/action-schemas";
import { parseDate, parseMoneyToCents } from "../src/lib/finance/inputs";
import { getFinancialEntryBalance } from "../src/lib/finance/ledger";
import { boletoCancellationDisposition } from "../src/lib/payments/boleto-cancellation";
import { recurringBoletoEntryWhere, recurringBoletoIssueDeadline } from "../src/lib/payments/recurring-charge-eligibility";
import { claimFinancialOnlineCharge } from "../src/lib/payments/financial-online-charge-claim";
import { financialEntryPermission } from "../src/lib/finance/entry-permissions";
import { loadPortalFinancialEntries } from "../src/lib/portal/finance-entries";
const url = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const safe = /^postgresql:\/\/postgres@127\.0\.0\.1:55433\/arena_goal(?:\?|$)/.test(url);
test("dependent billing snapshots guardian, spends guardian credit atomically, and fixed plans reserve without duplicate charges", { skip: !safe }, async () => {
    const runtimeUrl = new URL(url);
    runtimeUrl.username = "arena_runtime";
    runtimeUrl.password = "";
    const db = new PrismaClient({ datasources: { db: { url: runtimeUrl.toString() } } });
    const rollback = new Error("discard synthetic test");
    try {
        await assert.rejects(db.$transaction(async (tx) => {
            const arena = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" } });
            const foreign = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" } });
            await tx.$executeRaw `SELECT set_config('app.arena_id',${arena.id},true)`;
            const parent = await tx.player.create({ data: { arenaId: arena.id, name: "Responsável dependentes QA", email: "guardian@example.test" } });
            const other = await tx.player.create({ data: { arenaId: arena.id, name: "Outro responsável QA" } });
            await validateGuardian(tx, arena.id, parent.id);
            const child = await tx.player.create({ data: { arenaId: arena.id, name: "Dependente QA", guardianId: parent.id } });
            await assert.rejects(validateGuardian(tx, arena.id, child.id, parent.id), /responsável ativo/);
            await assert.rejects(validateGuardian(tx, arena.id, parent.id, parent.id), /si mesmo/);
            await assert.rejects(validateGuardian(tx, foreign.id, parent.id), /responsável ativo/);
            const invoice = await tx.financialEntry.create({ data: { arenaId: arena.id, playerId: child.id, type: "REVENUE", category: "Plano de aulas", description: "Plano do dependente QA", amountCents: 10000, dueDate: new Date("2035-01-10T12:00:00Z") } });
            assert.equal(invoice.billingPlayerId, parent.id);
            assert.equal(invoice.playerId, child.id);
            await tx.player.update({ where: { id: child.id }, data: { guardianId: other.id } });
            assert.equal((await tx.financialEntry.findUniqueOrThrow({ where: { id: invoice.id } })).billingPlayerId, parent.id);
            const [owned] = await loadPortalFinancialEntries(tx, arena.id, parent.id, new Date("2035-01-30T12:00:00Z"));
            assert(owned.some(e => e.id === invoice.id && e.player?.id === child.id));
            const foreignPlayer = await tx.player.findFirst({ where: { arenaId: foreign.id }, select: { id: true } });
            // The runtime cannot even read players of another arena.
            assert.equal(foreignPlayer, null);
            await tx.$executeRawUnsafe('SAVEPOINT tenant_guardian');
            await assert.rejects(tx.player.update({ where: { id: child.id }, data: { guardianId: "goal-athlete-b" } }));
            await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT tenant_guardian');
            await tx.$executeRawUnsafe('SAVEPOINT tenant_billing');
            await assert.rejects(tx.financialEntry.update({ where: { id: invoice.id }, data: { billingPlayerId: "goal-athlete-b" } }));
            await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT tenant_billing');
            let portalPlayerId = parent.id; let providerCalls=0;let canceledProvider:string[]=[];let cancelFails=false;const providerStatuses:Record<string,string>={};
            const auth = { arenaId: arena.id, userId: "goal-test", userName: "Operador QA" };
            const mocks: Record<string, unknown> = {
                "@prisma/client": { Prisma }, zod:{z},
                "@/lib/auth/player-session":{requirePublicPlayerAuth:async()=>({arenaId:arena.id,playerId:portalPlayerId})},
                "@/lib/env":{env:{appUrl:"http://localhost"}},
                "@/lib/payments/portal-checkout-policy":{portalCheckoutPolicy},
                "@/lib/payments/portal-checkout-expiry":{expirePortalCheckoutsForArena:async()=>{}},
                "@/lib/payments/boleto-cancellation":{boletoCancellationDisposition},
                "@/lib/payments/recurring-charge-eligibility":{recurringBoletoIssueDeadline},
                "@/lib/payments/recurring-online-charges":{issueRecurringOnlineChargeForEntry:async()=>({created:false,skipped:false})},
                "@/lib/payments/mercado-pago":{getMercadoPagoPayment:async(_arena:string,id:string)=>{assert.equal(_arena,arena.id);return{status:providerStatuses[id]??"pending"};},cancelMercadoPagoPayment:async(_arena:string,id:string)=>{assert.equal(_arena,arena.id);canceledProvider.push(id);if(cancelFails)throw new Error("Pagamento já recebido no emissor.");},createHostedCheckout:async()=>{providerCalls++;return {id:"guardian-checkout-qa",checkoutUrl:"https://checkout.example.test/guardian"};}}, "node:crypto": { randomUUID }, "next/cache": { revalidatePath() { } },
                "@/lib/auth/guards": { requirePermission: async () => auth, requireModuleEdit: async () => auth },
                "@/lib/auth/session": { requireArenaAccess: async () => auth },
                "@/lib/permissions": { canPerformPermission: () => true },
                "@/lib/finance/entry-permissions": { financialEntryPermission },
                "@/lib/clients/dependents": { validateGuardian },
            "@/lib/finance/action-schemas": { settlementSchema },
                "@/lib/finance/inputs": { parseDate, parseMoneyToCents },
                "@/lib/finance/ledger": { getFinancialEntryBalance },
                "@/lib/finance/revalidation": { refreshFinanceRoutes() { } },
                "@/lib/rls": { withArenaTransaction: async (id: string, fn: any) => { assert.equal(id, arena.id); return fn(tx); } },
                "@/lib/plans/fixed-court":{availableFixedTimes,fixedMonthAmount,fixedCycle,fixedSchedules},
                "@/lib/finance/receiving-bank-account":{requireReceivingBankAccount},
                "@/lib/calendar/online-booking-hold": { activeCourtOccurrenceWhere },
                "@/lib/scheduling/recurrence": { expandWeeklyOccurrences },
            };
            const load = (path: string) => { const exports: any = {}; vm.runInNewContext(ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Date, FormData, Error, console, require: withDatabaseModuleMocks((name: string) => mocks[name] ?? {}) }); return exports; };
            const dependentActions = load("src/lib/actions/dependents.ts");
        const repeatedDependent = new FormData(); repeatedDependent.set("guardianId",other.id); repeatedDependent.set("name",child.name);
        assert.match((await dependentActions.createDependentAction(repeatedDependent)).error,/Já existe um dependente/);
        await tx.clientBalanceMovement.create({ data: { arenaId: arena.id, playerId: parent.id, kind: "MONEY", amountCents: 15000, reason: "Crédito QA" } });
            const portalBank=await tx.bankAccount.create({data:{arenaId:arena.id,name:"Conta Portal responsável QA"}});
            const settings={portalPaymentsConfigured:true,portalPaymentEnabled:true,portalPixEnabled:true,portalCreditCardEnabled:false,portalPaymentBankAccountId:portalBank.id};
            await tx.arenaOperationalSettings.upsert({where:{arenaId:arena.id},create:{arenaId:arena.id,...settings},update:settings});
            const portal=load("src/lib/actions/public-finance-payment.ts");
            const pay=new FormData();pay.set("arenaSlug",arena.slug);pay.append("entryId",invoice.id);
            assert.equal((await portal.startPublicFinancialEntryPaymentAction(pay)).checkoutUrl,"https://checkout.example.test/guardian");
            assert.equal(providerCalls,1);
            const checkout=await tx.onlinePaymentCheckout.findFirstOrThrow({where:{arenaId:arena.id,playerId:parent.id,items:{some:{financialEntryId:invoice.id}}}});
            portalPlayerId=other.id;
            await assert.rejects(portal.startPublicFinancialEntryPaymentAction(pay),/não estão disponíveis/);
            assert.equal(providerCalls,1);
            await tx.onlinePaymentCheckout.update({where:{id:checkout.id},data:{status:"CANCELED"}});
            const finance = load("src/lib/actions/finance.ts");
            const form = new FormData();
            Object.entries({ entryId: invoice.id, expectedUpdatedAt: invoice.updatedAt.toISOString(), bankAccountId: "", discount: "0", discountMode: "AMOUNT", amount: "100,00", interest: "0", paymentMethod: "CREDIT_BALANCE", paidAt: "2035-01-10", notes: "" }).forEach(([k, v]) => form.set(k, v));
            await finance.settleFinancialEntryAction(form);
            assert.equal((await tx.financialEntry.findUniqueOrThrow({ where: { id: invoice.id } })).status, "PAID");
            assert.equal((await tx.clientBalanceMovement.aggregate({ where: { playerId: parent.id, kind: "MONEY" }, _sum: { amountCents: true } }))._sum.amountCents, 5000);
            const poor = await tx.financialEntry.create({ data: { arenaId: arena.id, playerId: child.id, type: "REVENUE", category: "QA", description: "Insuficiente", amountCents: 10000 } });
            form.set("entryId", poor.id);
            form.set("expectedUpdatedAt", poor.updatedAt.toISOString());
            await assert.rejects(finance.settleFinancialEntryAction(form), /insuficiente/);
            assert.equal(await tx.financialSettlement.count({ where: { financialEntryId: poor.id } }), 0);
            const court = await tx.court.create({ data: { arenaId: arena.id, name: "Quadra plano fixo QA" } });
            await tx.courtWeeklyRule.create({data:{courtId:court.id,weekday:1,startsAtMinute:420,endsAtMinute:1320}});
            const plan = await tx.sponsorshipPlan.create({ data: { arenaId: arena.id, name: "Plano quadra QA", kind: "FIXED_COURT", courtId: court.id, weekday: 1, startMinute: 600, durationMinutes: 90, monthlyAmountCents: 30000, dueDay: 10 } });
            const fixed = load("src/lib/actions/fixed-court-plans.ts");
            const enrollment = new FormData();
            Object.entries({ planId: plan.id, playerId: child.id, startsAt: "2035-01-01", endsAt: "2035-02-28" }).forEach(([k, v]) => enrollment.set(k, v));
            assert.equal((await fixed.enrollFixedCourtPlanAction(enrollment)).success, true);
            const series = await tx.scheduleBookingSeries.findFirstOrThrow({ where: { sponsorshipPlanId: plan.id } });
            assert.equal(await tx.scheduleOccurrence.count({ where: { bookingSeriesId: series.id } }), 9);
            const bills = await tx.financialEntry.findMany({ where: { source: "FIXED_COURT_PLAN", externalReference: series.id }, orderBy: { dueDate: "asc" } });
            assert.equal(bills.length, 2);
            assert(bills.every(e => e.amountCents === 30000 && e.billingPlayerId === other.id));
            assert.equal(await tx.financialEntry.count({ where: { source: "SCHEDULE_BOOKING", externalReference: { in: (await tx.scheduleOccurrence.findMany({ where: { bookingSeriesId: series.id }, select: { id: true } })).map(o => o.id) } } }), 0);
            assert.match((await fixed.enrollFixedCourtPlanAction(enrollment)).error, /já possui/);
            enrollment.set("playerId", parent.id);
            assert.match((await fixed.enrollFixedCourtPlanAction(enrollment)).error, /já está reservado/);
            assert.equal(await tx.scheduleBookingSeries.count({ where: { sponsorshipPlanId: plan.id } }), 1);
            await tx.financialEntry.update({ where: { id: bills[0].id }, data: { status: "PAID", paidAt: new Date() } });
            const end = new FormData();
            end.set("seriesId", series.id);
            assert.equal((await fixed.endFixedCourtPlanAction(end)).success, true);
            assert.equal(await tx.scheduleOccurrence.count({ where: { bookingSeriesId: series.id, status: "CANCELED" } }), 9);
            assert.equal((await tx.financialEntry.findUniqueOrThrow({ where: { id: bills[0].id } })).status, "PAID");
            assert.equal((await tx.financialEntry.findUniqueOrThrow({ where: { id: bills[1].id } })).status, "VOIDED");
            // A standard plan has no court/time: two clients can choose their own.
            const standard=await tx.sponsorshipPlan.create({data:{arenaId:arena.id,name:"Plano padrão QA",kind:"FIXED_COURT",monthlyAmountCents:40000,dueDay:5,dueDays:[5,15],prorateFifthWeek:true}});
            await tx.paymentMethodSetting.upsert({where:{arenaId_name:{arenaId:arena.id,name:"PIX"}},create:{arenaId:arena.id,name:"PIX"},update:{active:true}});
            const paidPlan=new FormData();
            Object.entries({planId:standard.id,playerId:parent.id,courtId:court.id,weekday:"1",startMinute:"600",durationMinutes:"90",dueDay:"15",prorateFifthWeek:"on",startsAt:"2035-01-01",endsAt:"2035-02-28",firstPaid:"on",paidAt:"2035-01-02",paymentMethod:"PIX",bankAccountId:portalBank.id}).forEach(([k,v])=>paidPlan.set(k,v));
            paidPlan.set("dueDay","7");assert.match((await fixed.enrollFixedCourtPlanAction(paidPlan)).error,/vencimento/);
            paidPlan.set("dueDay","15");paidPlan.set("startMinute","0");assert.match((await fixed.enrollFixedCourtPlanAction(paidPlan)).error,/disponíveis/);
            paidPlan.set("startMinute","600");assert.equal((await fixed.enrollFixedCourtPlanAction(paidPlan)).success,true);
            const member=await tx.scheduleBookingSeries.findFirstOrThrow({where:{sponsorshipPlanId:standard.id,responsiblePlayerId:parent.id}});
            assert.equal(member.dueDay,15);assert.equal(member.prorateFifthWeek,true);
            const proportional=await tx.financialEntry.findMany({where:{externalReference:member.id,source:"FIXED_COURT_PLAN"},orderBy:{dueDate:"asc"},include:{settlements:true}});
            assert.deepEqual(proportional.map(e=>e.amountCents),[50000,40000]);assert.equal(proportional[0].status,"PAID");assert.equal(proportional[0].settlements[0].amountCents,50000);assert.equal(proportional[0].paidAt?.toISOString().slice(0,10),"2035-01-02");assert.equal(proportional[1].status,"PENDING");
            paidPlan.set("playerId",other.id);paidPlan.set("startMinute","720");paidPlan.delete("firstPaid");assert.equal((await fixed.enrollFixedCourtPlanAction(paidPlan)).success,true);
            assert.equal(await tx.scheduleBookingSeries.count({where:{sponsorshipPlanId:standard.id}}),2);
            const pixelBills=await tx.financialEntry.findMany({where:{externalReference:member.id,source:"FIXED_COURT_PLAN"}});
            assert(pixelBills.every(e=>e.paymentMethod==="PIX"&&!e.automaticBoleto));
            paidPlan.set("playerId",child.id);paidPlan.set("startMinute","840");paidPlan.set("paymentMethod","Boleto");
            assert.equal((await fixed.enrollFixedCourtPlanAction(paidPlan)).success,true);
            const boletoMember=await tx.scheduleBookingSeries.findFirstOrThrow({where:{sponsorshipPlanId:standard.id,responsiblePlayerId:child.id}});
            const futureBoletoBills=await tx.financialEntry.findMany({where:{externalReference:boletoMember.id,source:"FIXED_COURT_PLAN"},orderBy:{dueDate:"asc"}});
            assert.equal(futureBoletoBills.length,2);assert(futureBoletoBills.every(e=>e.automaticBoleto&&e.paymentMethod==="Boleto"&&e.bankAccountId===portalBank.id));
            assert.equal(await tx.financialEntry.count({where:{...recurringBoletoEntryWhere(arena.id),id:{in:futureBoletoBills.map(e=>e.id)}}}),2);
            assert.equal(futureBoletoBills[0].dueDate?.toISOString().slice(0,10),"2035-01-15");

            const multiCourt=await tx.court.create({data:{arenaId:arena.id,name:"Quadra multi QA"}});
            for(const weekday of [1,3]) await tx.courtWeeklyRule.create({data:{courtId:multiCourt.id,weekday,startsAtMinute:420,endsAtMinute:1320}});
            const multiPlan=await tx.sponsorshipPlan.create({data:{arenaId:arena.id,name:"Plano 2x QA",kind:"FIXED_COURT",reservationCredits:8,dueDays:[10],monthlyAmountCents:40000}});
            const multiForm=new FormData();
            Object.entries({planId:multiPlan.id,playerId:parent.id,courtId:multiCourt.id,durationMinutes:"90",startsAt:"2035-01-01",endsAt:"2035-02-28",schedules:JSON.stringify([{weekday:1,startMinute:600},{weekday:3,startMinute:660}]),dueDay:"10",prorateFifthWeek:"on"}).forEach(([k,v])=>multiForm.set(k,v));
            assert.equal((await fixed.enrollFixedCourtPlanAction(multiForm)).success,true);
            const multiSeries=await tx.scheduleBookingSeries.findMany({where:{sponsorshipPlanId:multiPlan.id}});
            assert.equal(multiSeries.length,2);assert.equal(multiSeries[0].fixedPlanEnrollmentId,multiSeries[1].fixedPlanEnrollmentId);
            const multiBills=await tx.financialEntry.findMany({where:{source:"FIXED_COURT_PLAN",externalReference:{in:multiSeries.map(r=>r.id)}},orderBy:{dueDate:"asc"}});
            assert.equal(multiBills.length,2,"uma mensalidade por ciclo, não por dia");assert.equal(multiBills[0].amountCents,50000);assert.match(multiBills[0].notes,/10 créditos de reserva/);assert.equal(multiBills[1].amountCents,40000);assert.match(multiBills[1].notes,/8 créditos de reserva/);
            await tx.financialEntry.update({where:{id:multiBills[0].id},data:{status:"PAID",paidAt:new Date()}});
            await tx.sponsorshipPlan.update({where:{id:multiPlan.id},data:{reservationCredits:16}});
            assert.equal((await reservationCreditGrants(tx,arena.id,[parent.id])).find(g=>g.entryId===multiBills[0].id)?.quantity,10,"créditos pagos preservam a configuração daquele ciclo");
            const endMulti=new FormData();endMulti.set("seriesId",multiSeries[1].id);assert.equal((await fixed.endFixedCourtPlanAction(endMulti)).success,true);
            assert.equal(await tx.scheduleBookingSeries.count({where:{sponsorshipPlanId:multiPlan.id,status:"ACTIVE"}}),0);
            assert.equal(await tx.scheduleOccurrence.count({where:{bookingSeriesId:{in:multiSeries.map(r=>r.id)},status:{not:"CANCELED"}}}),0);
            const explicitClaim=await claimFinancialOnlineCharge(tx,{arenaId:arena.id,entryId:futureBoletoBills[0].id,method:"BOLETO",expectedAmountCents:futureBoletoBills[0].amountCents,requireActiveBoletoRecurrence:true});
            assert.equal(explicitClaim.ok,true);
            assert.equal((await claimFinancialOnlineCharge(tx,{arenaId:arena.id,entryId:futureBoletoBills[0].id,method:"BOLETO",expectedAmountCents:futureBoletoBills[0].amountCents,requireActiveBoletoRecurrence:true})).ok,false,"não duplica emissão em andamento");
            const recurring=await tx.financialRecurrence.create({data:{arenaId:arena.id,type:"REVENUE",category:"QA",counterpartyName:parent.name,description:"Fila QA",amountCents:5000,frequency:"MONTHLY",startsAt:new Date(),nextDueDate:new Date(),onlinePaymentMethod:"BOLETO",playerId:parent.id}});
            const queued=await tx.financialEntry.create({data:{arenaId:arena.id,type:"REVENUE",category:"QA",description:"Boleto fila QA",amountCents:5000,recurrenceId:recurring.id,playerId:parent.id,bankAccountId:portalBank.id}});
            const queue=load("src/lib/actions/boleto-queue.ts"),cancel=new FormData();cancel.set("entryId",queued.id);
            assert.equal((await queue.cancelQueuedBoletoAction(cancel)).success,true);
            assert.equal(canceledProvider.length,0);assert.equal((await tx.financialEntry.findUniqueOrThrow({where:{id:queued.id}})).status,"PENDING");
            assert.equal(await tx.financialEntry.count({where:{...recurringBoletoEntryWhere(arena.id),id:queued.id}}),0);
            assert.equal((await tx.financialRecurrence.findUniqueOrThrow({where:{id:recurring.id}})).active,true);
            assert.equal((await claimFinancialOnlineCharge(tx,{arenaId:arena.id,entryId:queued.id,method:"BOLETO",expectedAmountCents:5000,requireActiveBoletoRecurrence:true})).ok,false);
            const issued=await tx.financialEntry.create({data:{arenaId:arena.id,type:"REVENUE",category:"QA",description:"Emitido QA",amountCents:5000,onlinePaymentId:"test-provider-id",onlinePaymentUrl:"https://example.test/boleto",onlinePaymentClaimMethod:"BOLETO",playerId:parent.id,bankAccountId:portalBank.id}});
            cancel.set("entryId",issued.id);cancelFails=true;assert.match((await queue.cancelQueuedBoletoAction(cancel)).error,/já recebido/);
            assert.equal((await tx.financialEntry.findUniqueOrThrow({where:{id:issued.id}})).onlinePaymentCanceledAt,null);
            cancelFails=false;assert.equal((await queue.cancelQueuedBoletoAction(cancel)).success,true);
            const canceled=await tx.financialEntry.findUniqueOrThrow({where:{id:issued.id}});assert(canceled.onlinePaymentCanceledAt);assert.equal(canceled.onlinePaymentUrl,"");assert.equal(canceled.onlinePaymentId,"test-provider-id");
            form.set("entryId",issued.id);form.set("expectedUpdatedAt",canceled.updatedAt.toISOString());form.set("amount","50,00");
            assert.equal((await finance.settleFinancialEntryAction(form)),undefined);
            const uncertain=await tx.financialEntry.create({data:{arenaId:arena.id,type:"REVENUE",category:"QA",description:"Emissão incerta QA",amountCents:5000,onlinePaymentClaimMethod:"BOLETO",onlinePaymentClaimedAt:new Date(),playerId:parent.id}});
            cancel.set("entryId",uncertain.id);assert.match((await queue.cancelQueuedBoletoAction(cancel)).error,/Emissão em andamento/);
            cancel.set("entryId","foreign-entry");assert.match((await queue.cancelQueuedBoletoAction(cancel)).error,/não encontrado/);
            const bulk=new FormData();bulk.append("entryId",queued.id);bulk.append("entryId","foreign-entry");
            const batch=await queue.cancelQueuedBoletosAction(bulk);assert.deepEqual(Array.from(batch.failedIds),["foreign-entry"]);assert.match(batch.error,/1 cancelado/);
            // Fully settled legacy entries are retired automatically, without touching receipts.
            const paidBoleto=await tx.financialEntry.create({data:{arenaId:arena.id,type:"REVENUE",category:"QA",description:"Pago com boleto pendente QA",amountCents:7000,status:"PAID",paymentMethod:"PIX",paidAt:new Date(),onlinePaymentId:"paid-pending-qa",onlinePaymentUrl:"https://example.test/old",onlinePaymentClaimMethod:"BOLETO",playerId:parent.id}});
            cancel.set("entryId",paidBoleto.id);assert.equal((await queue.cancelQueuedBoletoAction(cancel)).success,true);assert.equal((await tx.financialEntry.findUniqueOrThrow({where:{id:paidBoleto.id}})).status,"PAID");
            const paidQueue=await tx.financialEntry.create({data:{arenaId:arena.id,type:"REVENUE",category:"QA",description:"Pago sem emitir QA",amountCents:7000,status:"PAID",paidAt:new Date(),recurrenceId:recurring.id,playerId:parent.id}});
            const partial=await tx.financialEntry.create({data:{arenaId:arena.id,type:"REVENUE",category:"QA",description:"Parcial QA",amountCents:7000,status:"PARTIAL",onlinePaymentId:"partial-qa",onlinePaymentClaimMethod:"BOLETO",settlements:{create:{arenaId:arena.id,amountCents:1000,paidAt:new Date(),paymentMethod:"PIX"}},playerId:parent.id}});
            const fullReceipt=await tx.financialEntry.create({data:{arenaId:arena.id,type:"REVENUE",category:"QA",description:"Recebido integral sem status atualizado QA",amountCents:7000,status:"PENDING",recurrenceId:recurring.id,settlements:{create:{arenaId:arena.id,amountCents:6000,discountCents:1200,interestCents:200,paidAt:new Date(),paymentMethod:"PIX"}},playerId:parent.id}});
            const approved=await tx.financialEntry.create({data:{arenaId:arena.id,type:"REVENUE",category:"QA",description:"Pago também no emissor QA",amountCents:7000,status:"PAID",paymentMethod:"PIX",paidAt:new Date(),onlinePaymentId:"paid-approved-qa",onlinePaymentClaimMethod:"BOLETO",playerId:parent.id}});providerStatuses[approved.onlinePaymentId]="approved";
            const reconciler=load("src/lib/payments/settled-boleto-reconciliation.ts");
            const before=await tx.financialSettlement.count({where:{arenaId:arena.id}});
            const reconciled=await reconciler.reconcileSettledBoletosForArena(arena.id);assert.equal(reconciled.failed,0);assert(reconciled.retired>=3);
            assert((await tx.financialEntry.findUniqueOrThrow({where:{id:paidBoleto.id}})).onlinePaymentCanceledAt);
            assert((await tx.financialEntry.findUniqueOrThrow({where:{id:paidQueue.id}})).boletoQueueCanceledAt);
            assert.equal((await tx.financialEntry.findUniqueOrThrow({where:{id:partial.id}})).boletoReconciledAt,null);
            assert((await tx.financialEntry.findUniqueOrThrow({where:{id:fullReceipt.id}})).boletoReconciledAt);
            const approvedAfter=await tx.financialEntry.findUniqueOrThrow({where:{id:approved.id}});assert(approvedAfter.boletoReconciledAt);assert.equal(approvedAfter.onlinePaymentCanceledAt,null);
            assert.equal(await tx.financialSettlement.count({where:{arenaId:arena.id}}),before);
            const callsAfter=canceledProvider.length;assert.equal((await reconciler.reconcileSettledBoletosForArena(arena.id)).retired,0);assert.equal(canceledProvider.length,callsAfter);
            const failedBoleto=await tx.financialEntry.create({data:{arenaId:arena.id,type:"REVENUE",category:"QA",description:"Cancelamento para repetir QA",amountCents:7000,status:"PAID",paidAt:new Date(),onlinePaymentId:"retry-cancel-qa",onlinePaymentClaimMethod:"BOLETO",playerId:parent.id}});
            cancelFails=true;assert.equal((await reconciler.reconcileSettledBoletosForArena(arena.id)).failed,1);assert.equal((await tx.financialEntry.findUniqueOrThrow({where:{id:failedBoleto.id}})).boletoReconciledAt,null);
            cancelFails=false;assert.equal((await reconciler.reconcileSettledBoletosForArena(arena.id)).retired,1);
            const excessive=new FormData();for(let i=0;i<101;i++)excessive.append("entryId",`qa-${i}`);assert.match((await queue.cancelQueuedBoletosAction(excessive)).error,/1 e 100/);
            throw rollback;
        }, { timeout: 60000 }), (e: any) => e === rollback);
    }
    finally {
        await db.$disconnect();
    }
});
