import { CourtCheckinChooser } from "@/components/courts/court-checkin-chooser";
import Link from "next/link";
import { instantToArenaWallClock, arenaWallClockToInstant } from "@/lib/calendar/arena-wall-clock";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { arenaDatabase } from "@/lib/arena-database";
import { getPublicPlayerAuth } from "@/lib/auth/player-session";
import { PublicClientAuthForm } from "@/components/public-client-auth-form";
export const dynamic = "force-dynamic";


export default async function CourtCheckinPage({ params, searchParams }: { params: Promise<{ arenaSlug: string }>; searchParams: Promise<{ token?: string }> }) {
  const { arenaSlug } = await params; const { token } = await searchParams;
  if (!token || token.length !== 64) notFound();
  const arena = await prisma.arena.findFirst({ where: { slug: arenaSlug, checkinEnabled: true, checkinToken: token }, select: { id: true, name: true, checkinMode: true } });
  if (!arena) return <main className="tw:grid tw:min-h-dvh tw:place-items-center tw:bg-slate-50 tw:p-5"><h1 className="tw:text-lg tw:text-[#17345c]">QR Code indisponível</h1></main>;
  const auth = await getPublicPlayerAuth(arenaSlug);
  const db = arenaDatabase(arena.id); const now = instantToArenaWallClock(new Date());
  const [slots, lessons] = auth ? await Promise.all([
    db.scheduleOccurrence.findMany({ where: { arenaId: arena.id, status: "SCHEDULED", startsAt: { gte: new Date(now.getTime() - 60 * 60_000), lte: new Date(now.getTime() + 60 * 60_000) }, endsAt: { gt: now } }, include: { occurrenceCourts: { where: { court: { active: true, arenaId: arena.id } }, include: { court: { select: { name: true } } } }, participants: { where: { player: { arenaId: arena.id, active: true }, ...(arena.checkinMode === "GROUP" ? { OR: [{ playerId: auth.playerId }, { occurrence: { OR: [{ responsiblePlayerId: auth.playerId }, { participants: { some: { playerId: auth.playerId } } }] } }] } : { playerId: auth.playerId }) }, select: { playerId: true, checkedInAt: true, player: { select: { name: true } } } } }, orderBy: { startsAt: "asc" } }),
    db.lesson.findMany({ where: { arenaId: arena.id, status: "SCHEDULED", scheduledAt: { gte: new Date(now.getTime() - 60 * 60_000), lte: new Date(now.getTime() + 3 * 60 * 60_000) }, attendances: { some: { student: { arenaId: arena.id, playerId: auth.playerId, active: true } } } }, include: { teacher: { select: { name: true } }, attendances: { where: { student: { arenaId: arena.id, playerId: auth.playerId, active: true } }, select: { checkedInAt: true } } }, orderBy: { scheduledAt: "asc" } }),
  ]) : [[], []];
  const time = (date: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(arenaWallClockToInstant(date));
  return <main className="tw:min-h-dvh tw:bg-[#f5f8fc] tw:p-4 tw:text-[#17345c] tw:[&_*]:box-border tw:md:p-8"><section className="tw:mx-auto tw:grid tw:w-full tw:max-w-2xl tw:gap-5 tw:rounded-lg tw:border tw:border-[#d3dfed] tw:bg-white tw:p-5 tw:shadow-sm"><header className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3 tw:border-b tw:border-[#d3dfed] tw:pb-4"><div><span className="tw:text-xs tw:text-slate-500">{arena.name}</span><h1 className="tw:mb-0 tw:mt-1 tw:text-lg tw:font-medium">{auth ? `Olá, ${auth.name.trim().split(/\s+/)[0]}` : "Check-in"}</h1></div>{auth?<Link className="tw:text-xs tw:text-[#215da5]" href={`/home?arena=${encodeURIComponent(arenaSlug)}`}>Meu Portal ↗</Link>:null}</header>{!auth?<PublicClientAuthForm arenaSlug={arenaSlug} returnTo={`/checkin/${encodeURIComponent(arenaSlug)}?token=${encodeURIComponent(token)}`}/>:<CourtCheckinChooser arenaSlug={arenaSlug} token={token} playerId={auth.playerId} mode={arena.checkinMode} slots={slots.filter(s=>s.occurrenceCourts.length&&(arena.checkinMode!=="GROUP"||s.responsiblePlayerId===auth.playerId||s.participants.some(p=>p.playerId===auth.playerId))).map(s=>({id:s.id,time:time(s.startsAt),end:time(s.endsAt),courts:s.occurrenceCourts.map(c=>({id:c.courtId,name:c.court.name})),participants:s.participants.map(p=>({playerId:p.playerId,name:p.player.name,checkedIn:Boolean(p.checkedInAt)}))}))} lessons={lessons.map(l=>({id:l.id,time:l.scheduledAt?time(l.scheduledAt):"",title:l.title,checkedIn:Boolean(l.attendances[0]?.checkedInAt)}))}/>}</section></main>;
}
