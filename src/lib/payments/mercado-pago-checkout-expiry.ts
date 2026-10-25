import { mercadoPagoAccessTokenForArena } from "@/lib/payments/mercado-pago";

type ExpiryInput = { arenaId: string; checkoutId: string; preferenceId: string; expiresAt: Date };
type ExpiryResult = { kind: "expired" | "review"; paymentIds: string[]; reviewPaymentIds: string[] };
const closedStatuses = new Set(["cancelled", "canceled", "rejected", "expired"]);
const cancellableStatuses = new Set(["pending", "in_process", "authorized"]);

/** A preference deadline alone does not cancel a Pix or a payment already in progress. */
export async function expireMercadoPagoCheckout(input: ExpiryInput, now = new Date(), options?: { allowFullyRefunded?: boolean }): Promise<ExpiryResult> {
  if (!input.arenaId || !input.checkoutId || !input.preferenceId || !Number.isFinite(input.expiresAt.getTime()) || input.expiresAt > now) {
    throw new Error("O checkout ainda não pode ser encerrado por expiração.");
  }
  const token = await mercadoPagoAccessTokenForArena(input.arenaId);
  const deadlineSignal = AbortSignal.timeout(30_000);
  async function request(path: string, method = "GET", body?: object): Promise<Record<string, any>> {
    const response = await fetch(`https://api.mercadopago.com${path}`, {
      method, headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.any([deadlineSignal, AbortSignal.timeout(15_000)]), cache: "no-store",
    });
    if (!response.ok) throw new Error(`O Mercado Pago não confirmou a expiração (${response.status}).`);
    const payload = await response.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Resposta inválida ao conferir expiração.");
    return payload;
  }
  const preference = await request(`/checkout/preferences/${encodeURIComponent(input.preferenceId)}`);
  const deadline = new Date(preference.expiration_date_to ?? "");
  if (String(preference.id ?? "") !== input.preferenceId || preference.external_reference !== input.checkoutId
    || preference.expires !== true || !Number.isFinite(deadline.getTime()) || deadline > now) {
    throw new Error("O provedor ainda não confirma que este link expirou.");
  }

  const paymentIds = new Set<string>();
  let expectedTotal: number | undefined;
  // The provider can have several attempts for a single preference. Never
  // release a debt after inspecting only the first page or the latest attempt.
  for (let offset = 0; ; offset += 50) {
    const query = new URLSearchParams({ external_reference: input.checkoutId, limit: "50", offset: String(offset) });
    const page = await request(`/v1/payments/search?${query}`);
    const total = page.paging?.total;
    if (!Array.isArray(page.results) || !Number.isSafeInteger(total) || total < 0 || total > 200
      || page.results.length !== Math.min(50, total - offset) || (expectedTotal !== undefined && total !== expectedTotal)) {
      throw new Error("Não foi possível conferir todas as tentativas deste pagamento.");
    }
    expectedTotal = total;
    for (const payment of page.results) {
      const id = String(payment?.id ?? "");
      if (!/^\d+$/.test(id) || payment.external_reference !== input.checkoutId) throw new Error("Referência divergente ao conferir pagamento.");
      paymentIds.add(id);
    }
    if (offset + page.results.length >= total) break;
  }
  if (paymentIds.size !== expectedTotal) throw new Error("A lista de tentativas mudou durante a conferência.");
  const reviewPaymentIds: string[] = [];
  for (const id of paymentIds) {
    const path = `/v1/payments/${encodeURIComponent(id)}`;
    let payment = await request(path);
    if (String(payment.id ?? "") !== id || payment.external_reference !== input.checkoutId) throw new Error("O pagamento não pertence a este checkout.");
    if (cancellableStatuses.has(String(payment.status))) {
      // Retrying cancellation is safe; a lost response must be reconciled by
      // GET before deciding whether a new checkout is permitted.
      try { await request(path, "PUT", { status: "cancelled" }); } catch { /* Confirm the authoritative state below. */ }
      payment = await request(path);
      if (String(payment.id ?? "") !== id || payment.external_reference !== input.checkoutId) throw new Error("Referência divergente após cancelamento.");
    }
    if (closedStatuses.has(String(payment.status))) continue;
    if (options?.allowFullyRefunded && payment.status === "refunded") continue;
    if (["approved", "refunded", "charged_back"].includes(String(payment.status))) { reviewPaymentIds.push(id); continue; }
    throw new Error("O provedor ainda não confirmou o cancelamento de todas as tentativas.");
  }
  return { kind: reviewPaymentIds.length ? "review" : "expired", paymentIds: [...paymentIds], reviewPaymentIds };
}
