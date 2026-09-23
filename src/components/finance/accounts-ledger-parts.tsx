"use client";

export type Account = {
  id: string;
  source: string;
  counterpartyName: string;
  category: string;
  description: string;
  amountCents: number;
  paymentMethod: string;
  bankAccountId: string | null;
  planId: string | null;
  productId: string | null;
  comanda: { id: string; code: string; label: string } | null;
  onlineProvider: string;
  onlinePaymentId: string;
  onlinePaymentUrl: string;
  onlinePaymentQrCode: string;
  onlinePaymentMethod: string;
  onlinePaymentPublishedAt: string | null;
  onlinePaymentViewedAt: string | null;
  dueDate: string | null;
  notes: string;
  status: string;
  voidReason: string;
  settlements: Array<{ amountCents: number; interestCents: number; paymentMethod: string; paidAt: string; notes: string }>;
  balance: { interestCents: number; paidCents: number; outstandingCents: number };
};

export type Option = { id: string; name: string; phone?: string; teacherId?: string; teacherName?: string; monthlyPriceCents?: number };

export function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function date(value: string | null) {
  return value ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`)) : "Sem vencimento";
}

export function amountInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function isOverdue(entry: Account) {
  if (entry.status !== "PENDING" || !entry.dueDate) return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return new Date(`${entry.dueDate}T12:00:00`) < today;
}

export function OnlineChargeBadge({ entry }: { entry: Account }) {
  if (entry.onlinePaymentUrl) {
    const boleto = entry.onlinePaymentMethod === "BOLETO" || entry.paymentMethod === "Boleto";
    const viewed = Boolean(entry.onlinePaymentViewedAt);
    const label = boleto ? viewed ? "Boleto emitido e visualizado pelo cliente" : "Boleto emitido e disponível no Portal do Atleta" : "Cobrança online emitida";
    return <span className="online-charge-icons">
      <span className="online-charge-icon online-charge-icon-boleto" data-tooltip={label} aria-label={label} tabIndex={0}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v5h5M8.5 13h7M8.5 16h5" /></svg></span>
      {viewed ? <span className="online-charge-icon online-charge-icon-viewed" data-tooltip="Boleto visualizado pelo cliente" aria-label="Boleto visualizado pelo cliente" tabIndex={0}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-5.5 9.5-5.5S21.5 12 21.5 12 18.1 17.5 12 17.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.3" /></svg></span> : null}
    </span>;
  }
  return entry.onlinePaymentMethod === "BOLETO" ? <small className="online-charge-status online-charge-pending">Boleto pendente de emissão</small> : null;
}

export function PlanSelectOptions({ plans }: { plans: Option[] }) {
  const groups = new Map<string, { teacherName: string; plans: Option[] }>();
  for (const plan of plans) {
    const key = plan.teacherId || "unassigned";
    const group = groups.get(key) ?? { teacherName: plan.teacherName || "Sem professor vinculado", plans: [] };
    group.plans.push(plan);
    groups.set(key, group);
  }

  return <>{[...groups.entries()].map(([key, group]) => (
    <optgroup key={key} label={`Professor: ${group.teacherName}`}>
      {group.plans.map((plan) => <option key={`${plan.id}-${plan.teacherId || "unassigned"}`} value={plan.id} data-monthly-price-cents={plan.monthlyPriceCents} data-teacher-id={plan.teacherId}>{plan.name}</option>)}
    </optgroup>
  ))}</>;
}
