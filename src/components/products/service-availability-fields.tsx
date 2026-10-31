"use client";

import type { ServiceBookingRules } from "@/lib/calendar/service-booking-rules";

const days = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const timeValue = (minute: number) => minute === 1440 ? "23:59" : `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

export function ServiceAvailabilityFields({ rules, onChange }: { rules: ServiceBookingRules; onChange: (rules: ServiceBookingRules) => void }) {
  const windows = rules.dailyWindows ?? [0,1,2,3,4,5,6].filter(weekday => !rules.weekdays.length || rules.weekdays.includes(weekday)).map(weekday => ({ weekday, startMinute: rules.startMinute, endMinute: rules.endMinute }));
  return <fieldset className="tw:min-w-0 tw:rounded-md tw:border tw:border-[var(--line)] tw:p-3">
    <legend className="tw:px-1 tw:text-xs tw:font-medium">Disponibilidade por dia</legend>
    <div className="tw:grid tw:grid-cols-[46px_minmax(0,1fr)_minmax(0,1fr)] tw:items-center tw:gap-x-2 tw:gap-y-1.5 tw:text-xs tw:viewport-360:grid-cols-2">
      <span className="tw:viewport-360:hidden">Dia</span><span>Início</span><span>Fim</span>
      {[1,2,3,4,5,6,0].map(weekday => {
        const window = windows.find(window => window.weekday === weekday);
        return <div key={weekday} className="tw:col-span-full tw:grid tw:grid-cols-subgrid tw:items-center tw:gap-x-2 tw:viewport-360:grid-cols-2 tw:viewport-360:gap-y-1 tw:viewport-360:border-t tw:viewport-360:border-[var(--line)] tw:viewport-360:pt-1.5">
          <label className="tw:flex tw:items-center tw:gap-1 tw:font-normal tw:viewport-360:col-span-full"><input type="checkbox" aria-label={days[weekday]} checked={Boolean(window)} onChange={event => onChange({ ...rules, dailyWindows: event.target.checked ? [...windows, { weekday, startMinute: rules.startMinute, endMinute: rules.endMinute }] : windows.filter(window => window.weekday !== weekday) })}/>{days[weekday].slice(0,3)}</label>
          {(["startMinute", "endMinute"] as const).map(key => <input key={key} type="time" aria-label={`${key === "startMinute" ? "Início" : "Fim"} de ${days[weekday]}`} required={Boolean(window)} disabled={!window} value={window ? timeValue(window[key]) : ""} className="tw:w-full tw:min-w-0 tw:px-1! tw:text-[11px]! tw:font-normal tw:disabled:opacity-40" onChange={event => { const [hour, minute] = event.target.value.split(":").map(Number); if (!Number.isFinite(hour + minute)) return; onChange({ ...rules, dailyWindows: windows.map(item => item.weekday === weekday ? { ...item, [key]: key === "endMinute" && hour === 23 && minute === 59 ? 1440 : hour * 60 + minute } : item) }); }}/>) }
        </div>;
      })}
    </div>
  </fieldset>;
}
