type Snapshot = Record<string, unknown>;
const fields: Record<string, string> = {
  name: "Nome", title: "Título", label: "Identificação", status: "Situação", active: "Ativo",
  amountCents: "Valor", totalCents: "Total", priceCents: "Preço", quantity: "Quantidade",
  currency: "Moeda", paymentMethod: "Forma de pagamento", startsAt: "Início", endsAt: "Fim",
  referenceDate: "Data de referência", openingBalanceCents: "Saldo inicial", expectedBalanceCents: "Saldo esperado",
  countedBalanceCents: "Saldo contado", voidReason: "Motivo da exclusão ou estorno", voidedAt: "Estornado em",
  paidAt: "Pago em", dueDate: "Vencimento", type: "Tipo", source: "Origem", interestCents: "Juros",
  serviceName: "Serviço reservado", showOnPortalBooking: "Visível na reserva online", bookingConcurrentLimit: "Limite simultâneo",
};
const statuses: Record<string, string> = { PAID: "Pago", PENDING: "Em aberto", OVERDUE: "Vencido", VOIDED: "Estornado / excluído", OPEN: "Aberta", CLOSED: "Fechada", CANCELED: "Cancelado", CONFIRMED: "Confirmado", SCHEDULED: "Agendado", REVENUE: "Conta a receber", INCOME: "Recebimento", EXPENSE: "Despesa", MANUAL: "Manual", COMANDA: "Comanda" };
function snapshot(value: unknown): Snapshot {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Snapshot : {};
}
export function auditFinancialOperation(action: string, details: Snapshot): string | null {
  if (action !== "DB:UPDATE:FinancialEntry") return null;
  const before = snapshot(details.before), after = snapshot(details.after);
  if (after.status === "VOIDED" && before.status !== "VOIDED") {
    if (!("voidReason" in after)) return "Lançamento invalidado (estorno ou exclusão)";
    return typeof after.voidReason === "string" && /^Excluído(?: em massa)? por /u.test(after.voidReason)
      ? "Lançamento excluído" : "Lançamento estornado";
  }
  if (after.status === "PAID" && before.status !== "PAID") return "Lançamento quitado";
  return null;
}
function display(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (key.endsWith("Cents") && typeof value === "number") return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value / 100);
  if ((key.endsWith("At") || key.endsWith("Date")) && typeof value === "string") {
    // PostgreSQL's to_jsonb(timestamp) omits a zone; Prisma stores these instants in UTC.
    const date = new Date(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`);
    if (!Number.isNaN(date.getTime())) return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(date);
  }
  if (typeof value !== "string" && typeof value !== "number") return "—";
  const text = String(value);
  return (statuses[text] ?? text).slice(0, 2000);
}
// Explicit allowlist: never render arbitrary request payloads or credentials.
export function auditSnapshotRows(details: Snapshot) {
  const before = snapshot(details.before), after = snapshot(details.after);
  const changed = Array.isArray(details.changedFields) ? details.changedFields : null;
  return Object.entries(fields).flatMap(([key, label]) => {
    if (!(key in before) && !(key in after)) return [];
    if (changed && !changed.includes(key)) return [];
    return [{ key, label, before: display(key, before[key]), after: display(key, after[key]) }];
  });
}
