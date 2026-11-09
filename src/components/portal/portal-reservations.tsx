import Link from "next/link";
import { ShareGameButton } from "@/components/courts/share-game-button";

type Reservation = NonNullable<Awaited<ReturnType<typeof import("@/lib/services/public-league-portal").getPublicLeaguePortal>>>["reservations"][number];

function CalendarIcon({ className = "tw:size-5" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18m-13 5 2 2 4-4"/></svg>;
}

export function PortalReservations({ reservations, arenaSlug, bookingHref }: { reservations: Reservation[]; arenaSlug: string; bookingHref: string }) {
  return <section aria-label="Reservas do atleta" className="tw:grid tw:min-w-0 tw:gap-4 tw:text-[var(--portal-ink)]">
    <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3">
      <p className="tw:m-0 tw:text-sm">{reservations.length ? `${reservations.length} ${reservations.length === 1 ? "reserva futura" : "reservas futuras"}` : "Seus próximos jogos"}</p>
      <Link href={bookingHref} className="tw:inline-flex tw:min-h-10 tw:w-fit tw:items-center tw:justify-center tw:gap-2 tw:rounded-md tw:bg-[#087443] tw:px-4 tw:py-2 tw:text-sm tw:font-normal tw:text-white tw:no-underline tw:transition-colors tw:hover:bg-[#065b35] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-2 tw:focus-visible:outline-[#087443]"><CalendarIcon className="tw:size-4 tw:shrink-0"/>Ver horários e reservar<svg viewBox="0 0 24 24" className="tw:size-4 tw:shrink-0" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></Link>
    </div>
    {reservations.length ? <div className="tw:grid tw:min-w-0 tw:gap-3 tw:min-[1000px]:grid-cols-2">{reservations.map(reservation => <article key={reservation.id} className="tw:grid tw:min-w-0 tw:content-start tw:gap-4 tw:rounded-lg tw:border tw:border-[var(--portal-line)] tw:border-l-4 tw:border-l-[#1e5ea8] tw:bg-[var(--portal-surface)] tw:p-4">
      <div className="tw:flex tw:flex-wrap tw:items-start tw:justify-between tw:gap-2"><h2 className="tw:m-0 tw:min-w-0 tw:break-words tw:text-lg tw:font-semibold">{reservation.courtName}</h2><span className={`tw:w-fit tw:rounded-md tw:px-2 tw:py-1 tw:text-xs ${reservation.status.startsWith("Aguardando") ? "tw:bg-[#fff3d9] tw:text-[#845006] tw:dark:bg-[#44331c] tw:dark:text-[#ffd792]" : "tw:bg-[#e5f3ec] tw:text-[#08643d] tw:dark:bg-[#16392b] tw:dark:text-[#9ee2bc]"}`}>{reservation.status}</span></div>
      <p className="tw:m-0 tw:flex tw:items-start tw:gap-2 tw:text-base tw:font-medium"><span className="tw:mt-0.5 tw:text-[#1e5ea8] tw:dark:text-[#8cbbf4]"><CalendarIcon/></span><span className="tw:min-w-0 tw:break-words">{reservation.when}</span></p>
      <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3 tw:border-t tw:border-[var(--portal-line)] tw:pt-3"><p className="tw:m-0 tw:min-w-0 tw:break-words tw:text-sm tw:text-[var(--portal-muted)]">{reservation.title}</p>{reservation.canShareGame ? <ShareGameButton arenaSlug={arenaSlug} occurrenceId={reservation.id}/> : null}</div>
    </article>)}</div> : <div className="tw:flex tw:min-h-56 tw:flex-col tw:items-center tw:justify-center tw:gap-4 tw:rounded-lg tw:border tw:border-[var(--portal-line)] tw:bg-[var(--portal-surface)] tw:px-5 tw:py-8 tw:text-center tw:min-[700px]:flex-row tw:min-[700px]:gap-6 tw:min-[700px]:text-left">
      <div className="tw:grid tw:size-16 tw:shrink-0 tw:place-items-center tw:rounded-xl tw:bg-[#174983] tw:text-white"><CalendarIcon className="tw:size-8"/></div>
      <div className="tw:max-w-md"><h2 className="tw:m-0 tw:text-lg tw:font-medium">Nenhuma reserva futura</h2><p className="tw:m-0 tw:mt-2 tw:text-sm tw:leading-relaxed tw:text-[var(--portal-muted)]">Escolha sua quadra e encontre o melhor horário para jogar.</p></div>
    </div>}
  </section>;
}
