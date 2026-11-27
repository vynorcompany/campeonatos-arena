import {getPortalOccupancy} from "@/lib/portal/support-query";
import Link from "next/link";
import { notFound } from "next/navigation";
import { arenaBookingPath } from "@/lib/arena-booking-path";

export async function PublicSchedule({ arenaSlug, date }: { arenaSlug: string; date?: string }) {
  const data=await getPortalOccupancy(arenaSlug,date);if(!data)notFound();
  const {courts,rows,selectedDate,previousDate,nextDate,onlineBookingEnabled}=data;
  const href = (value:string) => `/home?${new URLSearchParams({arena:arenaSlug,section:"schedule",data:value})}`;
  return <section className="tw:grid tw:min-w-0 tw:gap-4">
    <p className="tw:m-0 tw:text-sm tw:leading-relaxed tw:text-[var(--portal-muted)]">Consulte a ocupação das quadras. Os dados dos outros atletas são privados.</p>
    <div className="tw:flex tw:flex-wrap tw:items-end tw:justify-between tw:gap-3">
      <form action="/home" className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-end tw:gap-2"><input type="hidden" name="arena" value={arenaSlug}/><input type="hidden" name="section" value="schedule"/><label className="tw:grid tw:gap-1 tw:text-xs tw:font-semibold">Data<input type="date" name="data" defaultValue={selectedDate} className="tw:min-h-11 tw:rounded-xl tw:border tw:border-[var(--portal-line)] tw:bg-[var(--portal-surface)] tw:px-3 tw:text-[var(--portal-ink)]" /></label><button className="tw:min-h-11 tw:cursor-pointer tw:rounded-xl tw:border tw:border-[var(--portal-line)] tw:bg-[var(--portal-surface)] tw:px-4 tw:text-sm tw:font-semibold tw:text-[var(--portal-ink)]">Ver data</button></form>
      <nav aria-label="Navegar na grade" className="tw:flex tw:gap-2"><Link href={href(previousDate)} className="tw:rounded-xl tw:border tw:border-[var(--portal-line)] tw:bg-[var(--portal-surface)] tw:px-3 tw:py-3 tw:text-xs tw:text-[var(--portal-ink)] tw:no-underline">← Anterior</Link><Link href={href(nextDate)} className="tw:rounded-xl tw:border tw:border-[var(--portal-line)] tw:bg-[var(--portal-surface)] tw:px-3 tw:py-3 tw:text-xs tw:text-[var(--portal-ink)] tw:no-underline">Próximo →</Link></nav>
    </div>
    <div className="tw:flex tw:flex-wrap tw:gap-3 tw:text-xs"><span>🟢 Livre</span><span>🟠 Ocupado</span><span>— Fora da disponibilidade</span></div>
    {courts.length ? <div role="region" aria-label="Grade de ocupação das quadras, role horizontalmente para ver todas" tabIndex={0} className="tw:max-h-[65dvh] tw:max-w-full tw:overflow-auto tw:rounded-2xl tw:border tw:border-[var(--portal-line)] tw:bg-[var(--portal-surface)] tw:focus-visible:outline-2 tw:focus-visible:outline-[#07408f]">
      <table className="tw:w-full tw:border-collapse tw:text-left tw:text-xs"><caption className="tw:sr-only">Ocupação em {selectedDate}. Horários de Brasília.</caption><thead className="tw:sticky tw:top-0 tw:z-10 tw:bg-[var(--portal-soft)]"><tr><th scope="col" className="tw:p-3">Horário</th>{courts.map(court => <th key={court.id} scope="col" className="tw:min-w-28 tw:p-3">{court.name}</th>)}</tr></thead><tbody>{rows.map(row => {
        return <tr key={row.minute} className="tw:border-t tw:border-[var(--portal-line)]"><th scope="row" className="tw:p-3 tw:font-medium">{row.label}</th>{courts.map((court,index) => {
          const occupied=row.states[index]==="OCCUPIED",available=row.states[index]==="FREE";
          return <td key={court.id} className="tw:px-2 tw:py-1.5"><span className={`tw:block tw:rounded-lg tw:px-3 tw:py-2 tw:font-medium ${occupied ? "tw:bg-[#fff0d8] tw:text-[#7d3900] tw:dark:bg-[#5b381a] tw:dark:text-[#ffe2a5]" : available ? "tw:bg-[#e3ebf5] tw:text-[#142f56] tw:dark:bg-[#1b3151] tw:dark:text-[#c8dcf7]" : "tw:text-[var(--portal-muted)]"}`}>{occupied ? "Ocupado" : available ? "Livre" : "—"}</span></td>;
        })}</tr>;
      })}</tbody></table>
    </div> : <p role="status">Nenhuma quadra ativa nesta arena.</p>}
    <p className="tw:m-0 tw:text-xs tw:text-[var(--portal-muted)]">A disponibilidade pode mudar. Antecedência mínima, duração e confirmação são verificadas ao reservar.</p>
    {onlineBookingEnabled ? <Link href={`${arenaBookingPath(arenaSlug)}?data=${selectedDate}`} className="tw:justify-self-start tw:rounded-xl tw:bg-[#14325b] tw:px-5 tw:py-3 tw:text-sm tw:font-semibold tw:text-white tw:no-underline">Reservar quadra →</Link> : <p role="status">Reservas online indisponíveis. Consulte a recepção.</p>}
  </section>;
}
