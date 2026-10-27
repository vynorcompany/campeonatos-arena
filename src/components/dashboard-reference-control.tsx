"use client";
import { useEffect, useState } from "react";
import { MoneyInput } from "@/components/forms/money-input";
export type DashboardReference = { enabled: boolean; value: number; label: string };
export function useDashboardReference(storageKey: string) {
  const empty: DashboardReference = { enabled: false, value: 0, label: "Meta" };
  const [stored, setStored] = useState({ key: storageKey, reference: empty });
  const reference = stored.key === storageKey ? stored.reference : empty;
  useEffect(() => {
    let next: DashboardReference = { enabled: false, value: 0, label: "Meta" };
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || "null");
      if (value && typeof value.enabled === "boolean" && Number.isFinite(value.value) && value.value >= 0 && typeof value.label === "string") next = { enabled: value.enabled, value: Math.min(value.value, 1_000_000_000_000), label: value.label.slice(0, 50) };
    } catch { /* Use the default when browser storage is unavailable. */ }
    setStored({ key: storageKey, reference: next });
  }, [storageKey]);
  const change = (value: DashboardReference) => { setStored({ key: storageKey, reference: value }); try { localStorage.setItem(storageKey, JSON.stringify(value)); } catch { /* The reference still works for this session. */ } };
  return [reference, change] as const;
}
export function DashboardReferenceControl({ reference, onChange, monetary = true, periodLabel }: { reference: DashboardReference; onChange: (value: DashboardReference) => void; monetary?: boolean; periodLabel?: string }) {
  return <details className="tw:relative tw:min-w-0 tw:text-xs"><summary className="tw:ml-auto tw:w-fit tw:cursor-pointer tw:list-none tw:rounded-md tw:border tw:border-[var(--line)] tw:px-2 tw:py-1.5 tw:text-[var(--muted)]" aria-label="Configurar linha de referência">Linha de corte</summary><div className="tw:mt-2 tw:grid tw:min-w-0 tw:gap-2 tw:rounded-md tw:border tw:border-[var(--line)] tw:bg-slate-50 tw:p-3">
    <label className="tw:flex tw:items-center tw:gap-2"><input type="checkbox" checked={reference.enabled} onChange={event => onChange({ ...reference, enabled: event.target.checked })} />Exibir linha</label>
    <div className="tw:grid tw:min-w-0 tw:grid-cols-2 tw:gap-2 tw:viewport-420:grid-cols-1"><label className="tw:grid tw:min-w-0 tw:gap-1">Referência<select aria-label="Referência" value={reference.label} onChange={event => onChange({ ...reference, label: event.target.value })} className="tw:w-full tw:min-w-0"><option>Meta</option>{monetary ? <option>Custo fixo</option> : null}<option>Referência</option></select></label><label className="tw:grid tw:min-w-0 tw:gap-1">Valor {monetary ? "(R$)" : "(quantidade)"}{monetary ? <MoneyInput aria-label="Valor (R$)" valueCents={reference.value} onValueCentsChange={value => onChange({ ...reference, value: Math.min(value, 1_000_000_000_000) })} className="tw:w-full tw:min-w-0" /> : <input type="number" min="0" max="1000000000000" step="1" value={reference.value} onChange={event => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= 0) onChange({ ...reference, value: Math.min(Math.round(value), 1_000_000_000_000) }); }} className="tw:w-full tw:min-w-0" />}</label></div>
    {periodLabel ? <small className="tw:text-[var(--muted)]">{periodLabel}</small> : null}
  </div></details>;
}
