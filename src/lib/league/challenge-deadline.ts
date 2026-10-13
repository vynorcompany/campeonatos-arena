import { arenaWallClockToInstant } from "@/lib/calendar/arena-wall-clock";

export function leagueProposalResponseDueAt(startsAt: Date, now = new Date()) {
  const dueAt = new Date(Math.min(
    now.getTime() + 48 * 60 * 60_000,
    arenaWallClockToInstant(startsAt).getTime() - 2 * 60 * 60_000,
  ));
  if (dueAt <= now) throw new Error("O horário sugerido não permite o prazo mínimo de resposta.");
  return dueAt;
}
