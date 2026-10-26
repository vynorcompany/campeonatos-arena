"use client";
import { createContext, useContext, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { blockAgendaSlotsAction } from "@/lib/actions/agenda-operations";
type Slot = { courtId: string; courtName: string; startsAt: string; endsAt: string };
const Selection = createContext<{ enabled: boolean; selected: Slot[]; toggle: (slot: Slot) => void } | null>(null);
export function AgendaBulkSelection({ children, allowed }: { children: ReactNode; allowed: boolean }) {
  const [enabled, setEnabled] = useState(false); const [selected, setSelected] = useState<Slot[]>([]); const [error, setError] = useState(""); const [pending, startTransition] = useTransition(); const router = useRouter();
  const toggle = (slot: Slot) => { if (pending) return; setSelected(rows => rows.some(row => row.courtId === slot.courtId && row.startsAt === slot.startsAt) ? rows.filter(row => row.courtId !== slot.courtId || row.startsAt !== slot.startsAt) : [...rows, slot]); };
  return <Selection.Provider value={{ enabled, selected, toggle }}>{allowed ? <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-3 tw:py-2 tw:text-xs"><label className="tw:flex tw:min-h-9 tw:cursor-pointer tw:items-center tw:gap-2"><input type="checkbox" checked={enabled} disabled={pending} onChange={e => { setEnabled(e.target.checked); setSelected([]); setError(""); }}/>Seleção múltipla de horários</label>{enabled ? <><span>{selected.length} selecionado(s)</span><button type="button" disabled={!selected.length || pending} className="tw:min-h-9 tw:rounded-md tw:border tw:border-[var(--line)] tw:px-3 tw:text-xs tw:disabled:opacity-50" onClick={() => { setError(""); const form = new FormData(); form.set("slots", JSON.stringify(selected)); startTransition(async () => { try { const result = await blockAgendaSlotsAction(form); if (result.error) { setError(result.error); return; } setSelected([]); setEnabled(false); router.refresh(); } catch (error) { setError(error instanceof Error ? error.message : "Não foi possível bloquear os horários."); } }); }}>{pending ? "Bloqueando…" : "Bloquear horários"}</button></> : null}{error ? <p role="alert" className="tw:m-0 tw:text-red-700">{error}</p> : null}</div> : null}{children}</Selection.Provider>;
}
export function AgendaSelectableSlot({ slot, children }: { slot: Slot; children: ReactNode }) {
  const state = useContext(Selection);
  if (!state?.enabled) return children;
  return <label className="tw:flex tw:min-h-11 tw:cursor-pointer tw:items-center tw:justify-center tw:gap-2 tw:p-2 tw:text-xs"><input type="checkbox" aria-label={`Selecionar ${slot.courtName} às ${slot.startsAt.slice(11,16)}`} checked={state.selected.some(row => row.courtId === slot.courtId && row.startsAt === slot.startsAt)} onChange={() => state.toggle(slot)}/>Livre</label>;
}
