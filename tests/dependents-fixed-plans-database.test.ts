import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { PrismaClient, Prisma } from "@prisma/client";
import { withDatabaseModuleMocks } from "./helpers/client-module-mocks";
import { validateGuardian } from "../src/lib/clients/dependents";
import { expandWeeklyOccurrences } from "../src/lib/scheduling/recurrence";
import { activeCourtOccurrenceWhere } from "../src/lib/calendar/online-booking-hold";
import { settlementSchema } from "../src/lib/finance/action-schemas";
import { parseDate, parseMoneyToCents } from "../src/lib/finance/inputs";
import { getFinancialEntryBalance } from "../src/lib/finance/ledger";
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
            const parent = await tx.player.create({ data: { arenaId: arena.id, name: "Responsável dependentes QA" } });
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
            const auth = { arenaId: arena.id, userId: "goal-test", userName: "Operador QA" };
            const mocks: Record<string, unknown> = {
                "@prisma/client": { Prisma }, "next/cache": { revalidatePath() { } },
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
                "@/lib/calendar/online-booking-hold": { activeCourtOccurrenceWhere },
                "@/lib/scheduling/recurrence": { expandWeeklyOccurrences },
            };
            const load = (path: string) => { const exports: any = {}; vm.runInNewContext(ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Date, FormData, console, require: withDatabaseModuleMocks((name: string) => mocks[name] ?? {}) }); return exports; };
            const dependentActions = load("src/lib/actions/dependents.ts");
        const repeatedDependent = new FormData(); repeatedDependent.set("guardianId",other.id); repeatedDependent.set("name",child.name);
        assert.match((await dependentActions.createDependentAction(repeatedDependent)).error,/Já existe um dependente/);
        await tx.clientBalanceMovement.create({ data: { arenaId: arena.id, playerId: parent.id, kind: "MONEY", amountCents: 15000, reason: "Crédito QA" } });
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
            throw rollback;
        }, { timeout: 60000 }), (e: any) => e === rollback);
    }
    finally {
        await db.$disconnect();
    }
});
