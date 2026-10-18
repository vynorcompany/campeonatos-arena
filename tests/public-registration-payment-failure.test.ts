import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../src/lib/actions/public-registration.ts", import.meta.url), "utf8");

function loadAction(createPayment: (input: Record<string, unknown>) => Promise<Record<string, unknown>>) {
  const registration = { id: "registration-a", tournamentId: "tournament-a", leadName: "Atleta Um", partnerName: "Atleta Dois", status: "PENDING_PAYMENT", paymentStatus: "PENDING", createdAt: new Date(), holdExpiresAt: null as Date | null };
  const updates: Array<Record<string, unknown>> = [];
  const releaseFilters: Array<Record<string, unknown>> = [];
  const paymentInputs: Array<Record<string, unknown>> = [];
  const contexts: string[] = [];
  let providerAtCreation = "";
  const tx = {
    tournament: { findUnique: async ({ where }: { where: { publicSlug?: string } }) => where.publicSlug
      ? { id: "tournament-a", arenaId: "arena-a" }
      : { id: "tournament-a", arenaId: "arena-a", name: "Torneio", registrationPhase: "REGISTRATIONS", registrationOpensAt: null, registrationClosesAt: null, earlyDiscountCents: 0, blockCategoryGap: false, categories: [{ id: "category-a", maxRegistrations: 16, priceFirstCents: 500, priceSecondCents: 500, priceThirdCents: 500, allowedRegistrationCategoryIds: [] }] } },
    publicTournamentRegistration: {
      count: async () => 0,
      findMany: async () => [],
      create: async ({ data }: { data: { paymentProvider: string; holdExpiresAt: Date | null } }) => { providerAtCreation = data.paymentProvider; registration.holdExpiresAt = data.holdExpiresAt; return registration; },
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        if (where.holdExpiresAt) { releaseFilters.push(where); return { count: 0 }; }
        updates.push(data); Object.assign(registration, data); return { count: 1 };
      },
    },
  };
  const prisma = { $transaction: async (operation: (client: unknown) => Promise<unknown>) => operation(tx) };
  const exports: Record<string, (state: unknown, formData: FormData) => Promise<Record<string, unknown>>> = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, FormData, Date, Error,
    require: (name: string) => {
      if (name === "next/cache") return { revalidatePath: () => undefined };
      if (name === "@/lib/payments/mercado-pago") return { createCardCheckout: (input: Record<string, unknown>) => { paymentInputs.push(input); return createPayment(input); }, createPixPayment: (input: Record<string, unknown>) => { paymentInputs.push(input); return createPayment(input); } };
      if (name === "@/lib/prisma") return { prisma };
      if (name === "@/lib/services/registration-pair") return { ensureTournamentPairFromRegistration: async () => undefined };
      if (name === "@/lib/validators/public-registration") return { createPublicRegistrationSchema: { safeParse: () => ({ success: true, data: { tournamentSlug: "torneio", categoryId: "category-a", paymentMethod: "CARD", leadName: "Atleta Um", leadEmail: "atleta@example.test", leadPhone: "559999999999", leadCpf: "11111111111", leadBirthDate: new Date("1990-01-01"), partnerName: "Atleta Dois", partnerPhone: "558888888888", partnerCpf: "22222222222", partnerBirthDate: new Date("1991-01-01") } }) } };
      if (name === "@/lib/env") return { env: { appUrl: "https://arena.example.test" } };
      if (name === "@/lib/tournaments/registration-order") return { lockTournamentRegistrations: async () => undefined, nextTournamentRegistrationOrder: async () => 1 };
      if (name === "@/lib/rls") return { setArenaRlsContext: async (_tx: unknown, arenaId: string) => { contexts.push(arenaId); }, withArenaTransaction: async (arenaId: string, operation: (client: typeof tx) => Promise<unknown>) => { contexts.push(arenaId); return operation(tx); } };
      return require(name);
    },
  });
  return { action: exports.createPublicRegistrationAction, registration, updates, releaseFilters, paymentInputs, contexts, providerAtCreation: () => providerAtCreation };
}

test("falha na criação da cobrança libera a vaga sem apagar a referência para callback tardio", async () => {
  const { action, registration, updates, releaseFilters, contexts, providerAtCreation } = loadAction(async () => { throw new Error("Mercado Pago indisponível"); });
  const result = await action({}, new FormData());
  assert.match(String(result.error), /Mercado Pago indisponível/);
  assert.equal(providerAtCreation(), "MERCADO_PAGO_PENDING");
  assert.equal(registration.status, "CANCELED");
  assert.equal(registration.paymentStatus, "PENDING");
  assert.equal(updates.length, 1);
  assert.equal(updates[0].paymentProvider, "MERCADO_PAGO_FAILED");
  assert.equal(releaseFilters.length, 1);
  assert.deepEqual(contexts, ["arena-a", "arena-a"]);
});

test("checkout de cartão mantém preferência separada do ID do pagamento", async () => {
  const { action, registration, updates, releaseFilters, paymentInputs, contexts } = loadAction(async () => ({ provider: "MERCADO_PAGO", reference: "preference-id", paymentId: "preference-id", qrCode: "", qrCodeBase64: "", checkoutUrl: "https://checkout.example.test", expiresAt: null }));
  const result = await action({}, new FormData());
  assert.equal(result.error, null);
  assert.equal(updates.length, 1);
  assert.equal(updates[0].paymentReference, "preference-id");
  assert.equal(registration.paymentStatus, "PENDING");
  assert.equal(updates[0].mercadoPagoPaymentId, "");
  assert.equal(releaseFilters.length, 1);
  assert.ok(registration.holdExpiresAt instanceof Date);
  assert.equal(paymentInputs[0].expiresAt, registration.holdExpiresAt);
  assert.deepEqual(contexts, ["arena-a", "arena-a"]);
});
