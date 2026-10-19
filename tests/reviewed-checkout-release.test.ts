import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import { PrismaClient } from "@prisma/client";
import { isProviderPaymentFullyReversed, markReviewedPaymentReversed, reviewedPaymentIdsFromNotes } from "../src/lib/payments/review-status";
import { canPerformPermission } from "../src/lib/permissions";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../src/lib/actions/online-payment-review.ts", import.meta.url), "utf8");
const testUrl = process.env.ARENA_GOAL_TEST_DATABASE_URL ?? "";
const disposableDatabase = (() => {
  try { const url = new URL(testUrl); return url.hostname === "127.0.0.1" && url.port === "55433" && url.pathname === "/arena_goal"; }
  catch { return false; }
})();

function loadAction(tx: unknown, providerStatus: string, arenaId = "arena-a") {
  let providerCalls = 0;
  let revalidations = 0;
  const permissions: string[] = [];
  const exports: Record<string, (id: string, confirmed: boolean) => Promise<{ ok: boolean; error?: string }>> = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports,
    require: (name: string) => {
      if (name === "next/cache") return { revalidatePath: () => { revalidations += 1; } };
      if (name === "@/lib/auth/guards") return { requirePermission: async (key: string) => { permissions.push(key); return { arenaId }; } };
      if (name === "@/lib/payments/mercado-pago") return { getMercadoPagoPayment: async () => { providerCalls += 1; return { status: providerStatus }; } };
      if (name === "@/lib/payments/review-status") return { isProviderPaymentFullyReversed, markReviewedPaymentReversed };
      if (name === "@/lib/rls") return { withArenaTransaction: async (_id: string, operation: (client: unknown) => unknown) => operation(tx) };
      return require(name);
    },
  });
  return { release: exports.releaseReviewedCheckoutAction, releaseEntry: exports.releaseReviewedFinancialEntryAction as unknown as (id: string, paymentId: string, confirmed: boolean) => Promise<{ ok: boolean; error?: string }>, cancelRegistration: exports.cancelReviewedRegistrationAction, providerCalls: () => providerCalls, revalidations: () => revalidations, permissions: () => permissions };
}

test("revisão de estornos exige quitação de recebíveis ou gestão de torneios, não uma edição financeira qualquer", async () => {
  assert.equal(canPerformPermission("finance:receivable:settle", "STAFF", "VIEWER", ["finance:receivable:create"]), false);
  assert.equal(canPerformPermission("finance:settings:manage", "STAFF", "VIEWER", ["finance:receivable:create"]), false);
  assert.equal(canPerformPermission("tournaments:manage", "STAFF", "VIEWER", ["tournaments:publish"]), false);
  const action = loadAction({}, "refunded");
  await action.release("", false);
  await action.releaseEntry("", "", false);
  await action.cancelRegistration("", false);
  assert.deepEqual(action.permissions(), ["finance:receivable:settle", "finance:receivable:settle", "tournaments:manage"]);
  assert.equal(action.providerCalls(), 0);
  for (const file of [
    "../src/app/(app)/relatorios/[relatorio]/page.tsx",
    "../src/app/(app)/torneios/inscricoes/page.tsx",
    "../src/app/(app)/torneios/[tournamentId]/inscricoes/page.tsx",
  ]) {
    const page = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(page, /canPerformPermission\(/);
    assert.doesNotMatch(page, /canEditModule\("(?:finance|tournaments)"/);
  }
});

test("somente estorno integral ou cancelamento liberam nova tentativa", () => {
  assert.equal(isProviderPaymentFullyReversed("refunded"), true);
  assert.equal(isProviderPaymentFullyReversed("cancelled"), true);
  assert.equal(isProviderPaymentFullyReversed("approved"), false);
  assert.equal(isProviderPaymentFullyReversed("partially_refunded"), false);
});

test("checkout em revisão permanece bloqueado até o provedor confirmar o estorno", async () => {
  const checkout = { id: "checkout-a", arenaId: "arena-a", status: "REVIEW", mercadoPagoPaymentId: "payment-a" };
  const tx = {
    $queryRaw: async () => [{ id: checkout.id }],
    onlinePaymentCheckout: {
      findFirst: async ({ where }: { where: { id: string; arenaId: string; status: string } }) => where.id === checkout.id && where.arenaId === checkout.arenaId && checkout.status === where.status ? checkout : null,
      updateMany: async ({ where, data }: { where: { arenaId: string; status: string; mercadoPagoPaymentId: string }; data: { status: string } }) => { if (where.arenaId !== checkout.arenaId || where.status !== checkout.status || where.mercadoPagoPaymentId !== checkout.mercadoPagoPaymentId) return { count: 0 }; checkout.status = data.status; return { count: 1 }; },
    },
  };
  const approved = loadAction(tx, "approved");
  assert.equal((await approved.release(checkout.id, true)).ok, false);
  assert.equal(checkout.status, "REVIEW");
  assert.equal(approved.revalidations(), 0);
  const refunded = loadAction(tx, "refunded");
  assert.equal((await refunded.release(checkout.id, false)).ok, false);
  assert.equal(refunded.providerCalls(), 0);
  assert.equal((await refunded.release(checkout.id, true)).ok, true);
  assert.equal(checkout.status, "REFUNDED");
  assert.equal(refunded.revalidations(), 1);
  assert.equal((await refunded.release(checkout.id, true)).ok, false);
  assert.equal(refunded.providerCalls(), 1);
});

test("checkout de outra arena não é liberado", async () => {
  const tx = { onlinePaymentCheckout: { findFirst: async () => null } };
  const action = loadAction(tx, "refunded", "arena-b");
  assert.equal((await action.release("checkout-a", true)).ok, false);
  assert.equal(action.providerCalls(), 0);
});

test("estorno de lançamento individual remove só o alerta do pagamento conferido", async () => {
  const notes = "Observação da arena\n[MP_REVIEW:payment-a] valor divergente\n[MP_REVIEW:payment-b] referência divergente";
  assert.deepEqual(reviewedPaymentIdsFromNotes(notes), ["payment-a", "payment-b"]);
  assert.equal(markReviewedPaymentReversed(notes, "payment-c"), null);
  const result = markReviewedPaymentReversed(notes, "payment-a")!;
  assert.match(result, /Observação da arena/);
  assert.match(result, /\[MP_REFUNDED:payment-a\]/);
  assert.match(result, /\[MP_REVIEW:payment-b\]/);
  assert.equal(result.includes("[MP_REVIEW:payment-a]"), false);

  const entry = { id: "entry-a", arenaId: "arena-a", status: "PENDING", notes };
  const tx = {
    $queryRaw: async () => [{ id: entry.id }],
    financialEntry: {
      findFirst: async ({ where }: { where: { arenaId: string; notes?: { contains: string } } }) => where.arenaId === entry.arenaId && (!where.notes || entry.notes.includes(where.notes.contains)) ? entry : null,
      updateMany: async ({ where, data }: { where: { arenaId: string; notes: string }; data: { notes: string } }) => { if (where.arenaId !== entry.arenaId || where.notes !== entry.notes) return { count: 0 }; entry.notes = data.notes; return { count: 1 }; },
    },
  };
  const approved = loadAction(tx, "approved");
  assert.equal((await approved.releaseEntry(entry.id, "payment-a", true)).ok, false);
  assert.equal(entry.notes, notes);
  const refunded = loadAction(tx, "refunded");
  assert.equal((await refunded.releaseEntry(entry.id, "payment-a", true)).ok, true);
  assert.equal(entry.status, "PENDING");
  assert.deepEqual(reviewedPaymentIdsFromNotes(entry.notes), ["payment-b"]);
  assert.equal((await refunded.releaseEntry(entry.id, "payment-a", true)).ok, false);
});

test("análise de lançamento de outra arena não é liberada", async () => {
  const tx = { financialEntry: { findFirst: async () => null } };
  const action = loadAction(tx, "refunded", "arena-b");
  assert.equal((await action.releaseEntry("entry-a", "payment-a", true)).ok, false);
  assert.equal(action.providerCalls(), 0);
});

test("inscrição em análise só é cancelada após estorno integral confirmado", async () => {
  const registration = { id: "reg-a", tournamentId: "tournament-a", status: "PENDING_PAYMENT", paymentStatus: "REVIEW", mercadoPagoPaymentId: "payment-a", paymentCheckoutUrl: "https://checkout.example", paymentQrCode: "old-code", paymentQrCodeBase64: "old-image" };
  const tx = {
    $queryRaw: async () => [{ id: registration.id }],
    publicTournamentRegistration: {
      findFirst: async ({ where }: { where: { id: string; tournament?: { arenaId: string }; status: { in: string[] }; paymentStatus: string } }) => where.id === registration.id && where.tournament?.arenaId === "arena-a" && where.status.in.includes(registration.status) && where.paymentStatus === registration.paymentStatus ? registration : null,
      updateMany: async ({ where, data }: { where: { id: string; status: { in: string[] }; paymentStatus: string; mercadoPagoPaymentId: string }; data: Partial<typeof registration> }) => {
        if (where.id !== registration.id || !where.status.in.includes(registration.status) || where.paymentStatus !== registration.paymentStatus || where.mercadoPagoPaymentId !== registration.mercadoPagoPaymentId) return { count: 0 };
        Object.assign(registration, data);
        return { count: 1 };
      },
    },
  };
  const approved = loadAction(tx, "approved");
  assert.equal((await approved.cancelRegistration(registration.id, true)).ok, false);
  assert.equal(registration.status, "PENDING_PAYMENT");
  const partial = loadAction(tx, "partially_refunded");
  assert.equal((await partial.cancelRegistration(registration.id, true)).ok, false);
  const refunded = loadAction(tx, "refunded");
  assert.equal((await refunded.cancelRegistration(registration.id, false)).ok, false);
  assert.equal(refunded.providerCalls(), 0);
  assert.equal((await refunded.cancelRegistration(registration.id, true)).ok, true);
  assert.equal(registration.status, "CANCELED");
  assert.equal(registration.paymentStatus, "REFUNDED");
  assert.equal(registration.paymentCheckoutUrl, "");
  assert.equal(registration.paymentQrCode, "");
  assert.equal((await refunded.cancelRegistration(registration.id, true)).ok, false);
});

test("inscrição de outra arena não pode ser cancelada", async () => {
  const tx = { publicTournamentRegistration: { findFirst: async () => null } };
  const action = loadAction(tx, "refunded", "arena-b");
  assert.equal((await action.cancelRegistration("reg-a", true)).ok, false);
  assert.equal(action.providerCalls(), 0);
});

test("revisão no banco respeita a arena, bloqueia aprovação e cancela só a inscrição estornada", { skip: !disposableDatabase }, async () => {
  const db = new PrismaClient({ datasources: { db: { url: testUrl } } });
  const rollback = new Error("rollback da inscrição em revisão");
  try {
    await assert.rejects(db.$transaction(async (tx) => {
      const arenaA = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-teste-goal" }, select: { id: true } });
      const arenaB = await tx.arena.findUniqueOrThrow({ where: { slug: "arena-beta-goal" }, select: { id: true } });
      const tournament = await tx.tournament.create({ data: { arenaId: arenaA.id, name: "Torneio revisão GOAL", publicSlug: `goal-review-${Date.now()}` }, select: { id: true } });
      const category = await tx.tournamentCategory.create({ data: { tournamentId: tournament.id, name: "Categoria GOAL", level: 1 }, select: { id: true } });
      const registration = await tx.publicTournamentRegistration.create({
        data: {
          tournamentId: tournament.id, categoryId: category.id, registrationOrder: 1,
          leadName: "Atleta A", leadPhone: "559999999999", leadCpf: "11111111111", leadBirthDate: new Date("1990-01-01"),
          partnerName: "Atleta B", partnerPhone: "558888888888", partnerCpf: "22222222222", partnerBirthDate: new Date("1991-01-01"),
          amountCents: 15000, paymentStatus: "REVIEW", status: "PENDING_PAYMENT", mercadoPagoPaymentId: "goal-review-payment",
          paymentCheckoutUrl: "https://checkout.example/review", paymentQrCode: "old-code", paymentQrCodeBase64: "old-image",
        }, select: { id: true },
      });

      const wrongArena = loadAction(tx, "refunded", arenaB.id);
      assert.equal((await wrongArena.cancelRegistration(registration.id, true)).ok, false);
      assert.equal(wrongArena.providerCalls(), 0);
      assert.equal((await tx.publicTournamentRegistration.findUniqueOrThrow({ where: { id: registration.id } })).paymentStatus, "REVIEW");

      const approved = loadAction(tx, "approved", arenaA.id);
      assert.equal((await approved.cancelRegistration(registration.id, true)).ok, false);
      const refunded = loadAction(tx, "refunded", arenaA.id);
      assert.equal((await refunded.cancelRegistration(registration.id, true)).ok, true);
      const result = await tx.publicTournamentRegistration.findUniqueOrThrow({ where: { id: registration.id } });
      assert.equal(result.status, "CANCELED");
      assert.equal(result.paymentStatus, "REFUNDED");
      assert.equal(result.mercadoPagoPaymentId, "goal-review-payment");
      assert.equal(result.paymentCheckoutUrl, "");
      assert.equal(result.paymentQrCode, "");
      assert.equal(result.paymentQrCodeBase64, "");
      const staleCheckout = await tx.publicTournamentRegistration.updateMany({
        where: { id: registration.id, tournamentId: tournament.id, status: "PENDING_PAYMENT", paymentStatus: "PENDING" },
        data: { paymentCheckoutUrl: "https://checkout.example/stale", paymentQrCode: "stale-code" },
      });
      assert.equal(staleCheckout.count, 0);
      assert.equal((await tx.publicTournamentRegistration.findUniqueOrThrow({ where: { id: registration.id } })).paymentCheckoutUrl, "");
      assert.equal((await refunded.cancelRegistration(registration.id, true)).ok, false);

      const latePayment = await tx.publicTournamentRegistration.create({ data: {
        tournamentId: tournament.id, categoryId: category.id, registrationOrder: 2,
        leadName: "Atleta C", leadPhone: "557777777777", leadCpf: "33333333333", leadBirthDate: new Date("1992-01-01"),
        partnerName: "Atleta D", partnerPhone: "556666666666", partnerCpf: "44444444444", partnerBirthDate: new Date("1993-01-01"),
        amountCents: 15000, paymentStatus: "REVIEW", status: "CANCELED", mercadoPagoPaymentId: "goal-late-payment",
      }, select: { id: true } });
      assert.equal((await refunded.cancelRegistration(latePayment.id, true)).ok, true);
      const resolvedLatePayment = await tx.publicTournamentRegistration.findUniqueOrThrow({ where: { id: latePayment.id } });
      assert.equal(resolvedLatePayment.status, "CANCELED");
      assert.equal(resolvedLatePayment.paymentStatus, "REFUNDED");
      throw rollback;
    }), (error: unknown) => error === rollback);
  } finally {
    await db.$disconnect();
  }
});
