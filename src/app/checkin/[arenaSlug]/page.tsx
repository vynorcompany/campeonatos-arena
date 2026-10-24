import Link from "next/link";
import { instantToArenaWallClock, arenaWallClockToInstant } from "@/lib/calendar/arena-wall-clock";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { arenaDatabase } from "@/lib/arena-database";
import { getPublicPlayerAuth } from "@/lib/auth/player-session";
import { PublicClientAuthForm } from "@/components/public-client-auth-form";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { PadelBackdrop } from "@/components/portal/padel-backdrop";
import { registerCourtCheckinAction, registerLessonQrCheckinAction } from "@/lib/actions/checkin";
export const dynamic = "force-dynamic";
const card = "tw:grid tw:min-w-0 tw:gap-3 tw:rounded-2xl tw:border tw:border-white/20 tw:bg-[#103b33]/90 tw:p-5 tw:shadow-xl tw:backdrop-blur-xl";
const button = "tw:min-h-12 tw:w-full tw:cursor-pointer tw:rounded-xl tw:border-0 tw:bg-[#c5f573] tw:px-4 tw:py-3 tw:text-sm tw:font-bold tw:text-[#183323] tw:transition-colors tw:hover:bg-[#d9ffa0] tw:focus-visible:outline-2 tw:focus-visible:outline-offset-4 tw:focus-visible:outline-white";

export default async function CourtCheckinPage({ params, searchParams }: { params: Promise<{ arenaSlug: string }>; searchParams: Promise<{ token?: string }> }) {
  const { arenaSlug } = await params; const { token } = await searchParams;
  if (!token || token.length !== 64) notFound();
  const arena = await prisma.arena.findFirst({ where: { slug: arenaSlug, checkinEnabled: true, checkinToken: token }, select: { id: true, name: true } });
  if (!arena) return <main className="tw:relative tw:isolate tw:grid tw:min-h-dvh tw:place-items-center tw:bg-[#061f1c] tw:p-6 tw:text-white"><PadelBackdrop fixed/><section className={card}><h1 className="tw:text-2xl tw:font-bold">QR Code indisponível</h1><p>Peça à recepção o QR Code atual para confirmar sua presença.</p></section></main>;
  const auth = await getPublicPlayerAuth(arenaSlug);
  const db = arenaDatabase(arena.id); const now = instantToArenaWallClock(new Date());
  const [slots, lessons] = auth ? await Promise.all([
    db.scheduleOccurrence.findMany({ where: { arenaId: arena.id, status: "SCHEDULED", startsAt: { lte: new Date(now.getTime() + 60 * 60_000) }, endsAt: { gt: now } }, include: { occurrenceCourts: { where: { court: { active: true, arenaId: arena.id } }, include: { court: { select: { name: true } } } }, participants: { where: { playerId: auth.playerId }, select: { checkedInAt: true } } }, orderBy: { startsAt: "asc" } }),
    db.lesson.findMany({ where: { arenaId: arena.id, status: "SCHEDULED", scheduledAt: { gte: new Date(now.getTime() - 8 * 60 * 60_000), lte: new Date(now.getTime() + 3 * 60 * 60_000) }, attendances: { some: { student: { arenaId: arena.id, playerId: auth.playerId, active: true } } } }, include: { teacher: { select: { name: true } }, attendances: { where: { student: { arenaId: arena.id, playerId: auth.playerId, active: true } }, select: { checkedInAt: true } } }, orderBy: { scheduledAt: "asc" } }),
  ]) : [[], []];
  const time = (date: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(arenaWallClockToInstant(date));
  return <main className="tw:relative tw:isolate tw:min-h-dvh tw:bg-[#061f1c] tw:px-4 tw:py-8 tw:text-[#eef9f2] tw:[&_*]:box-border tw:md:px-8 tw:md:py-12">
    <PadelBackdrop fixed />
    <div className="tw:mx-auto tw:grid tw:w-full tw:max-w-[1060px] tw:min-w-0 tw:gap-7">
      <header className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-4"><div className="tw:flex tw:items-center tw:gap-3"><img src="/icon.svg?v=padel-2" alt="" className="tw:size-12 tw:rounded-xl"/><span><strong className="tw:block tw:text-sm">{arena.name}</strong><small className="tw:text-[10px] tw:font-bold tw:tracking-[.15em] tw:text-[#bde5cc]">CHECK-IN DA ARENA</small></span></div>{auth ? <Link href={`/home?arena=${encodeURIComponent(arenaSlug)}`} className="tw:rounded-xl tw:border tw:border-white/30 tw:bg-[#123d34]/80 tw:px-4 tw:py-3 tw:text-xs tw:font-semibold tw:text-white tw:no-underline">Ir para meu Portal ↗</Link> : null}</header>
      <div className="tw:py-5 tw:md:py-10"><span className="tw:text-[10px] tw:font-bold tw:tracking-[.2em] tw:text-[#c5f573]">SEU JOGO COMEÇA COM A PRESENÇA</span><h1 className="tw:mt-3 tw:mb-3 tw:max-w-xl tw:text-[clamp(2rem,5vw,3.5rem)] tw:leading-[1.05] tw:font-semibold tw:tracking-[-.045em]">Confirme sua presença<span className="tw:text-[#c5f573]">.</span></h1><p className="tw:max-w-md tw:text-sm tw:leading-relaxed tw:text-[#cee2d9]">{auth ? `${auth.name}, selecione sua reserva ou sua aula para fazer check-in.` : "Entre com seu cadastro no clube para confirmar sua reserva ou aula."}</p></div>
      {!auth ? <div className="tw:w-full tw:max-w-lg tw:rounded-3xl tw:bg-white tw:p-5 tw:text-[#183323] tw:shadow-2xl"><PublicClientAuthForm arenaSlug={arenaSlug} returnTo={`/checkin/${encodeURIComponent(arenaSlug)}?token=${encodeURIComponent(token)}`} /></div> : <div className="tw:grid tw:min-w-0 tw:gap-6 tw:md:grid-cols-2">
        <section className="tw:grid tw:min-w-0 tw:content-start tw:gap-3" aria-label="Check-in de reservas"><h2 className="tw:m-0 tw:text-xl tw:font-semibold">Reservas de quadra</h2><p className="tw:m-0 tw:mb-2 tw:text-xs tw:leading-relaxed tw:text-[#cee2d9]">De uma hora antes do início até o fim da reserva. Horários de Brasília.</p>
          {!slots.some(slot => slot.occurrenceCourts.length) ? <p role="status" className={card}>Nenhuma reserva disponível para check-in agora.</p> : slots.flatMap(slot => slot.occurrenceCourts.map(court => <article key={`${slot.id}-${court.courtId}`} className={card}>
            <span className="tw:text-[10px] tw:font-bold tw:tracking-widest tw:text-[#bde5cc]">QUADRA</span><strong className="tw:text-lg">{court.court.name}</strong><span className="tw:text-sm tw:text-[#cee2d9]">{time(slot.startsAt)} às {time(slot.endsAt)}</span>
            {slot.participants[0]?.checkedInAt ? <p role="status" className="tw:m-0 tw:rounded-xl tw:bg-[#c5f573]/15 tw:p-3 tw:text-sm tw:font-semibold tw:text-[#d5ff9b]">✓ Presença confirmada</p> : <SafeActionForm action={registerCourtCheckinAction} successMessage="Check-in confirmado! Sua presença foi registrada na grade."><input type="hidden" name="arenaSlug" value={arenaSlug}/><input type="hidden" name="token" value={token}/><input type="hidden" name="occurrenceId" value={slot.id}/><input type="hidden" name="courtId" value={court.courtId}/><SubmitButton label="Confirmar reserva" pendingLabel="Confirmando..." className={button}/></SafeActionForm>}
          </article>))}
        </section>
        <section className="tw:grid tw:min-w-0 tw:content-start tw:gap-3" aria-label="Check-in de aulas"><h2 className="tw:m-0 tw:text-xl tw:font-semibold">Minhas aulas</h2><p className="tw:m-0 tw:mb-2 tw:text-xs tw:leading-relaxed tw:text-[#cee2d9]">De três horas antes até oito horas após o início. O check-in utiliza uma aula do seu saldo mensal.</p>
          {!lessons.length ? <p role="status" className={card}>Nenhuma aula disponível para check-in agora.</p> : lessons.map(lesson => <article className={card} key={lesson.id}>
            <span className="tw:text-[10px] tw:font-bold tw:tracking-widest tw:text-[#bde5cc]">AULA</span><strong className="tw:text-lg">{lesson.title}</strong><span className="tw:text-sm tw:text-[#cee2d9]">{lesson.scheduledAt ? time(lesson.scheduledAt) : ""} · {lesson.teacher?.name || "Professor da arena"}</span>
            {lesson.attendances[0]?.checkedInAt ? <p role="status" className="tw:m-0 tw:rounded-xl tw:bg-[#c5f573]/15 tw:p-3 tw:text-sm tw:font-semibold tw:text-[#d5ff9b]">✓ Presença confirmada na aula</p> : <SafeActionForm action={registerLessonQrCheckinAction} successMessage="Presença confirmada! Uma aula foi utilizada do seu saldo mensal."><input type="hidden" name="arenaSlug" value={arenaSlug}/><input type="hidden" name="token" value={token}/><input type="hidden" name="lessonId" value={lesson.id}/><SubmitButton label="Confirmar aula" pendingLabel="Confirmando..." className={button}/></SafeActionForm>}
          </article>)}
        </section>
      </div>}
      <footer className="tw:pb-4 tw:text-[10px] tw:font-medium tw:tracking-wide tw:text-[#b9d3c6]">QUADRAS E AULAS · CONFIRMAÇÃO SEGURA DE PRESENÇA</footer>
    </div>
  </main>;
}
