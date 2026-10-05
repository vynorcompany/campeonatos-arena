"use client";

import { useEffect, useRef, useState } from "react";

export function ReservationReportCourtFilter({ courts, selectedIds }: { courts: { id: string; name: string; active: boolean }[]; selectedIds: string[] }) {
  const [selected, setSelected] = useState(new Set(selectedIds));
  const all = useRef<HTMLInputElement>(null);
  const allSelected = courts.length > 0 && selected.size === courts.length;
  useEffect(() => { if (all.current) all.current.indeterminate = selected.size > 0 && !allSelected; }, [selected, allSelected]);
  return <fieldset className="reservation-court-filter tw:m-0 tw:min-w-0 tw:basis-full tw:viewport-800:basis-auto tw:w-full tw:rounded-lg tw:border tw:border-[var(--line)] tw:p-3 tw:[&.reservation-court-filter_label]:flex tw:[&.reservation-court-filter_label]:items-center tw:[&.reservation-court-filter_label]:gap-2 tw:[&.reservation-court-filter_label]:font-normal tw:[&.reservation-court-filter_input]:size-4 tw:[&.reservation-court-filter_input]:min-h-0 tw:[&.reservation-court-filter_input]:p-0 tw:[&.reservation-court-filter_input]:accent-[var(--primary)]">
    <legend className="tw:px-1 tw:text-xs tw:font-semibold tw:text-[var(--muted)]">Quadras</legend>
    <input type="hidden" name="quadras" value="selecionadas" />
    <label><input ref={all} type="checkbox" checked={allSelected} disabled={!courts.length} onChange={event => setSelected(new Set(event.target.checked ? courts.map(court => court.id) : []))} />Todas as quadras</label>
    <div className="tw:mt-2 tw:flex tw:flex-wrap tw:gap-x-4 tw:gap-y-2">{courts.map(court => <label key={court.id}><input type="checkbox" name="quadra" value={court.id} checked={selected.has(court.id)} onChange={event => setSelected(current => { const next = new Set(current); if (event.target.checked) next.add(court.id); else next.delete(court.id); return next; })} />{court.name}{court.active ? "" : " (inativa)"}</label>)}</div>
    {!selected.size ? <p className="tw:m-0 tw:mt-2 tw:text-xs tw:text-[var(--muted)]">Selecione uma ou mais quadras para gerar o relatório.</p> : null}
  </fieldset>;
}
