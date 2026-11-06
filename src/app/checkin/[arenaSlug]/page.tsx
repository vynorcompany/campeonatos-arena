import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { CourtCheckinChooser } from "@/components/courts/court-checkin-chooser";
import { PortalTheme } from "@/components/portal/portal-theme";
import { PortalThemeToggle } from "@/components/portal/portal-theme-controls";
import { PublicClientAuthForm } from "@/components/public-client-auth-form";
import { instantToArenaWallClock, arenaWallClockToInstant } from "@/lib/calendar/arena-wall-clock";
import { checkinGameWhere, gameCheckinPath } from "@/lib/checkin/game";
import { prisma } from "@/lib/prisma";
import { arenaDatabase } from "@/lib/arena-database";
import { getPublicPlayerAuth } from "@/lib/auth/player-session";
export const dynamic = "force-dynamic";

export default async function CourtCheckinPage({ params, searchParams }: { params: Promise<{ arenaSlug: string }>; searchParams: Promise<{ token?: string; jogo?: string }> }) {
  const { arenaSlug } = await params;
  const { token, jogo } = await searchParams;
  if (typeof token !== "string" || token.length !== 64) notFound();
  const focusId = typeof jogo === "string" && jogo.length <= 160 ? jogo : "";
  const arena = await prisma.arena.findFirst({ where: { slug: arenaSlug, checkinEnabled: true, checkinToken: token }, select: { id: true, name: true, logoUrl: true, checkinMode: true } });
  if (!arena) return <main className="tw:grid tw:min-h-dvh tw:place-items-center tw:bg-slate-50 tw:p-5"><h1 className="tw:text-lg tw:text-[#17345c]">QR Code indisponível</h1></main>;
  const auth = await getPublicPlayerAuth(arenaSlug);
  const db = arenaDatabase(arena.id);
  const now = instantToArenaWallClock(new Date());
  const include = {
    responsiblePlayer: { select: { id: true, name: true, arenaId: true, active: true } },
    occurrenceCourts: { where: { court: { active: true, arenaId: arena.id } }, include: { court: { select: { name: true, color: true } } } },
    participants: { where: { player: { arenaId: arena.id, active: true } }, orderBy: { id: "asc" as const }, select: { playerId: true, checkedInAt: true, player: { select: { name: true } } } },
  } satisfies Prisma.ScheduleOccurrenceInclude;
  const baseWhere = { arenaId: arena.id, status: "SCHEDULED", ...checkinGameWhere, endsAt: { gt: now } };
  const [nearby, focused, lessons] = auth ? await Promise.all([
    db.scheduleOccurrence.findMany({ where: { ...baseWhere, startsAt: { gte: new Date(now.getTime()-60*60_000), lte: new Date(now.getTime()+60*60_000) } }, include, orderBy: { startsAt: "asc" }, take: 100 }),
    focusId ? db.scheduleOccurrence.findFirst({ where: { ...baseWhere, id: focusId }, include }) : Promise.resolve(null),
    db.lesson.findMany({ where: { arenaId: arena.id, status: "SCHEDULED", scheduledAt: { gte: new Date(now.getTime()-60*60_000), lte: new Date(now.getTime()+3*60*60_000) }, attendances: { some: { student: { arenaId: arena.id, playerId: auth.playerId, active: true } } } }, include: { teacher: { select: { name: true } }, attendances: { where: { student: { arenaId: arena.id, playerId: auth.playerId, active: true } }, select: { checkedInAt: true } } }, orderBy: { scheduledAt: "asc" }, take: 30 }),
  ]) : [[], null, []];
  const slots = [...nearby, ...(focused && !nearby.some(game=>game.id===focused.id) ? [focused] : [])].filter(game=>game.occurrenceCourts.length).sort((a,b)=>a.startsAt.getTime()-b.startsAt.getTime());
  const time = (value: Date) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(value);
  const date = (value: Date) => new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).format(value);
  const returnTo = focusId ? gameCheckinPath(arenaSlug, token, focusId) : `/checkin/${encodeURIComponent(arenaSlug)}?token=${encodeURIComponent(token)}`;
  return <PortalTheme className="tw:[--panel:#fff] tw:[--text:#111827] tw:[--muted:#536b86] tw:[--line:#d3dfed] tw:[--primary:#215da5] tw:dark:[--panel:#101c2d] tw:dark:[--text:#eff3f8] tw:dark:[--muted:#bdd9e6] tw:dark:[--line:#3b4e66] tw:min-h-dvh tw:bg-[#f5f8fc] tw:text-[#111827] tw:dark:bg-[#071421] tw:dark:text-[#eff3f8] tw:[&_*]:box-border">
    <main className="tw:mx-auto tw:grid tw:w-full tw:max-w-[1180px] tw:min-w-0 tw:gap-5 tw:px-5 tw:py-6 tw:viewport-700:gap-4 tw:viewport-700:px-3 tw:viewport-700:py-3">
      <header className="tw:flex tw:min-w-0 tw:items-center tw:justify-between tw:gap-3 tw:rounded-lg tw:border tw:border-[#d3dfed] tw:bg-white tw:px-4 tw:py-3 tw:dark:border-[#293648] tw:dark:bg-[#101c2d]"><div className="tw:flex tw:min-w-0 tw:items-center tw:gap-3"><img src={arena.logoUrl} alt={`Logo ${arena.name}`} className="tw:h-10 tw:w-14 tw:shrink-0 tw:object-contain"/><span className="tw:min-w-0 tw:break-words tw:text-sm tw:font-medium">{arena.name}</span></div><div className="tw:flex tw:shrink-0 tw:items-center tw:gap-3"><PortalThemeToggle/>{auth ? <Link href={`/home?arena=${encodeURIComponent(arenaSlug)}`} className="tw:text-xs tw:text-[#174983] tw:dark:text-[#9bc5ff]">Meu Portal ↗</Link> : null}</div></header>
      <section className="tw:relative tw:isolate tw:overflow-hidden tw:rounded-lg tw:bg-[#174983] tw:px-7 tw:py-12 tw:text-white tw:viewport-700:px-5 tw:viewport-700:py-8"><img src="/portal-padel-hero.webp" alt="" className="tw:absolute tw:inset-0 tw:-z-20 tw:h-full tw:w-full tw:object-cover"/><div className="tw:absolute tw:inset-0 tw:-z-10 tw:bg-gradient-to-r tw:from-[#102e52]/95 tw:to-[#102e52]/10"/><h1 className="tw:m-0 tw:text-3xl tw:font-semibold tw:leading-tight tw:viewport-700:text-2xl">{auth ? `Olá, ${auth.name.trim().split(/\s+/)[0]}.` : "Check-in"}</h1><p className="tw:mb-0 tw:mt-2 tw:text-sm">Seu jogo começa aqui.</p></section>
      {!auth ? <section className="tw:mx-auto tw:w-full tw:max-w-lg tw:rounded-lg tw:border tw:border-[#d3dfed] tw:bg-white tw:p-5 tw:dark:border-[#293648] tw:dark:bg-[#101c2d]"><PublicClientAuthForm arenaSlug={arenaSlug} returnTo={returnTo}/></section> : <CourtCheckinChooser arenaSlug={arenaSlug} token={token} playerId={auth.playerId} playerName={auth.name} mode={arena.checkinMode} initialGameId={focusId} slots={slots.map(game=>{
        const own = game.participants.some(participant=>participant.playerId===auth.playerId);
        const responsible = game.responsiblePlayer?.arenaId===arena.id && game.responsiblePlayer.active ? game.responsiblePlayer : null;
        const canManage = responsible?.id===auth.playerId || own;
        return { id: game.id, time: time(game.startsAt), end: time(game.endsAt), date: date(game.startsAt), responsibleName: responsible?.name ?? game.participants[0]?.player.name ?? "Reserva da arena", isResponsible: responsible?.id===auth.playerId, canManage, opensAt: arenaWallClockToInstant(game.startsAt).getTime()-60*60_000, closesAt: Math.min(arenaWallClockToInstant(game.startsAt).getTime()+60*60_000, arenaWallClockToInstant(game.endsAt).getTime()-1), courts: game.occurrenceCourts.map(c=>({id:c.courtId,name:c.court.name,color:c.court.color})), participants: game.participants.filter(p=>p.playerId===auth.playerId || (arena.checkinMode==="GROUP" && canManage)).map(p=>({playerId:p.playerId,name:p.player.name,checkedIn:Boolean(p.checkedInAt)})) };
      })} lessons={lessons.map(lesson=>({ id: lesson.id, time: lesson.scheduledAt ? time(lesson.scheduledAt) : "", title: lesson.title, teacherName: lesson.teacher?.name ?? "", checkedIn: Boolean(lesson.attendances[0]?.checkedInAt) }))}/>}
      {auth ? <Link href={`/home?arena=${encodeURIComponent(arenaSlug)}`} className="tw:w-fit tw:text-xs tw:text-[#174983] tw:dark:text-[#9bc5ff]">← Voltar ao Portal</Link> : null}
    </main>
  </PortalTheme>;
}
