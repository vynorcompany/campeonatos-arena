"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { viewStyles } from "./accounts-ledger-parts.utilities";

export type Account = {
  composition?: { originalCents: number; interestCents: number; discountCents: number; adjustedCents: number; creationKnown: boolean };
  id: string;
  updatedAt: string;
  source: string;
  canCardInstallment?: boolean;
  counterpartyName: string;
  playerId?: string | null;
  supplierId?: string | null;
  payeeEmployeeId?: string | null;
  payeeTeacherId?: string | null;
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
  paidAt?: string | null;
  competenceDate?: string | null;
  notes: string;
  status: string;
  voidReason: string;
  settlements: Array<{ amountCents: number; discountCents?: number; interestCents: number; paymentMethod: string; paidAt: string; notes: string }>;
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
    return <span className={viewStyles.online_charge_icons}>
      <span className={viewStyles.online_charge_icon} data-tooltip={label} aria-label={label} tabIndex={0}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z" /><path d="M15 3v5h5M8.5 13h7M8.5 16h5" /></svg></span>
      {viewed ? <span className={viewStyles.online_charge_icon_online_charge_icon_viewed} data-tooltip="Boleto visualizado pelo cliente" aria-label="Boleto visualizado pelo cliente" tabIndex={0}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-5.5 9.5-5.5S21.5 12 21.5 12 18.1 17.5 12 17.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.3" /></svg></span> : null}
    </span>;
  }
  return entry.onlinePaymentMethod === "BOLETO" ? <small className={viewStyles.online_charge_status_online_charge_pending}>Boleto pendente de emissão</small> : null;
}

export function PlanSelectOptions({ plans, includeTeacherAll = false }: { plans: Option[]; includeTeacherAll?: boolean }) {
  const groups = new Map<string, { teacherName: string; plans: Option[] }>();
  for (const plan of plans) {
    const key = plan.teacherId || "unassigned";
    const group = groups.get(key) ?? { teacherName: plan.teacherName || "Sem professor vinculado", plans: [] };
    group.plans.push(plan);
    groups.set(key, group);
  }

  return <>{[...groups.entries()].map(([key, group]) => (
    <optgroup key={key} label={`Professor: ${group.teacherName}`}>
      {includeTeacherAll && key !== "unassigned" ? <option value={`teacher:${key}`}>Todos os planos de {group.teacherName}</option> : null}
      {group.plans.map((plan) => <option key={`${plan.id}-${plan.teacherId || "unassigned"}`} value={plan.id} data-monthly-price-cents={plan.monthlyPriceCents} data-teacher-id={plan.teacherId}>{plan.name}</option>)}
    </optgroup>
  ))}</>;
}

export type LedgerValueMode = "adjusted" | "interest" | "original";
export const ledgerValueModes: { value: LedgerValueMode; label: string }[] = [
  { value: "adjusted", label: "Total ajustado" },
  { value: "interest", label: "Somente juros" },
  { value: "original", label: "Somente valor original" },
];

export function LedgerValueModeSelector({ value, onChange }: { value: LedgerValueMode; onChange: (value: LedgerValueMode) => void }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 16, top: 16 });
  const trigger = useRef<HTMLButtonElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => popup.current?.querySelector<HTMLInputElement>("input:checked")?.focus({ preventScroll: true }));
    const outside = (event: PointerEvent) => { if (!trigger.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); } };
    const close = () => setOpen(false);
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape); window.addEventListener("resize", close); window.addEventListener("scroll", close, true);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); window.removeEventListener("resize", close); window.removeEventListener("scroll", close, true); };
  }, [open]);
  return <><button ref={trigger} type="button" aria-label={`Base da soma selecionada: ${ledgerValueModes.find(mode => mode.value === value)?.label}`} title="Selecionar base da soma" aria-expanded={open} aria-controls={open ? id : undefined} onClick={event => { const rect = event.currentTarget.getBoundingClientRect(); setPosition({ left: Math.max(16, Math.min(rect.right - 240, window.innerWidth - 256)), top: window.innerHeight - rect.bottom > 180 ? rect.bottom + 6 : Math.max(16, rect.top - 174) }); setOpen(current => !current); }} className="tw:inline-grid tw:size-6 tw:shrink-0 tw:cursor-pointer tw:place-items-center tw:rounded tw:border tw:border-[#b3c3d7] tw:bg-white tw:text-[#174983] tw:hover:bg-[#f1f6fc] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#174983]"><svg className="tw:size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h16l-6 7v8l-4 2V11Z"/></svg></button>{open && typeof document !== "undefined" ? createPortal(<div ref={popup} id={id} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false); }} role="radiogroup" aria-label="Base da soma selecionada" style={position} className="tw:fixed tw:z-[200] tw:grid tw:w-60 tw:max-w-[calc(100vw-32px)] tw:gap-1 tw:rounded-md tw:border tw:border-[#cbd6e5] tw:bg-white tw:p-2 tw:text-xs tw:font-normal tw:normal-case tw:text-[#172536] tw:shadow-[0_7px_18px_#17253620]">{ledgerValueModes.map(mode => <label key={mode.value} className="tw:flex tw:min-h-10 tw:cursor-pointer tw:items-center tw:gap-2 tw:rounded tw:px-2 tw:hover:bg-[#f1f6fc]"><input type="radio" name={id} value={mode.value} checked={value === mode.value} onChange={() => { onChange(mode.value); setOpen(false); trigger.current?.focus(); }} className="tw:size-4 tw:shrink-0 tw:accent-[#174983] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#174983]"/>{mode.label}</label>)}</div>, document.body) : null}</>;
}
