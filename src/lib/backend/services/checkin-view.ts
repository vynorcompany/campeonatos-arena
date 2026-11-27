import "server-only";
import type { Prisma } from "@prisma/client";
import { instantToArenaWallClock, arenaWallClockToInstant } from "@/lib/calendar/arena-wall-clock";
import {checkinGameWhere} from "@/lib/checkin/game";
import {prisma} from "@/lib/prisma";
import {arenaDatabase} from "@/lib/arena-database";
import {getPublicPlayerAuth} from "@/lib/backend/services/player-session";
import {checkinViewSchema} from "@/lib/backend/contracts/checkin";
export async function resolveCheckinView(arenaSlug:string,token:string,focusId:string){
  const arena = await prisma.arena.findFirst({ where: { slug: arenaSlug, checkinEnabled: true, checkinToken: token }, select: { id: true, name: true, logoUrl: true, checkinMode: true } });
  if (!arena) return null;
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
  return checkinViewSchema.parse({arena:{name:arena.name,logoUrl:arena.logoUrl,checkinMode:arena.checkinMode},auth:auth?{playerId:auth.playerId,name:auth.name}:null,slots:auth?slots.map(game=>{
        const own = game.participants.some(participant=>participant.playerId===auth.playerId);
        const responsible = game.responsiblePlayer?.arenaId===arena.id && game.responsiblePlayer.active ? game.responsiblePlayer : null;
        const canManage = responsible?.id===auth.playerId || own;
        return { id: game.id, time: time(game.startsAt), end: time(game.endsAt), date: date(game.startsAt), responsibleName: responsible?.name ?? game.participants[0]?.player.name ?? "Reserva da arena", isResponsible: responsible?.id===auth.playerId, canManage, opensAt: arenaWallClockToInstant(game.startsAt).getTime()-60*60_000, closesAt: Math.min(arenaWallClockToInstant(game.startsAt).getTime()+60*60_000, arenaWallClockToInstant(game.endsAt).getTime()-1), courts: game.occurrenceCourts.map(c=>({id:c.courtId,name:c.court.name,color:c.court.color})), participants: game.participants.filter(p=>p.playerId===auth.playerId || (arena.checkinMode==="GROUP" && canManage)).map(p=>({playerId:p.playerId,name:p.player.name,checkedIn:Boolean(p.checkedInAt)})) };
      }):[],lessons:lessons.map(lesson=>({ id: lesson.id, time: lesson.scheduledAt ? time(lesson.scheduledAt) : "", title: lesson.title, teacherName: lesson.teacher?.name ?? "", checkedIn: Boolean(lesson.attendances[0]?.checkedInAt) }))});
}
