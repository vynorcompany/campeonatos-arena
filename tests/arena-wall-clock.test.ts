import assert from "node:assert/strict";
import test from "node:test";
import { arenaDateInput, arenaToday, arenaWallClockToInstant, instantToArenaWallClock } from "../src/lib/calendar/arena-wall-clock";
import { upcomingPlayerReservationsWhere } from "../src/lib/portal/upcoming-reservations";
import { leagueProposalResponseDueAt } from "../src/lib/league/challenge-deadline";

test("horário da arena mantém o instante correto independentemente do fuso do servidor", () => {
  const originalTimeZone = process.env.TZ;
  try {
    for (const serverTimeZone of ["UTC", "America/Sao_Paulo"]) {
      process.env.TZ = serverTimeZone;
      assert.equal(arenaWallClockToInstant(new Date(2026, 9, 13, 18, 0)).toISOString(), "2026-10-13T21:00:00.000Z");
      assert.equal(arenaWallClockToInstant(new Date(2026, 9, 13, 23, 30)).toISOString(), "2026-10-14T02:30:00.000Z");
      assert.equal(instantToArenaWallClock(new Date("2026-10-13T21:00:00.000Z")).getHours(), 18);
      const now = new Date("2026-10-13T19:00:00.000Z");
      assert.deepEqual(upcomingPlayerReservationsWhere("arena", "player", now).startsAt, { gte: new Date(2026, 9, 13, 16) });
      assert.equal(leagueProposalResponseDueAt(new Date(2026, 9, 13, 20), now).toISOString(), "2026-10-13T21:00:00.000Z");
      assert.throws(() => leagueProposalResponseDueAt(new Date(2026, 9, 13, 18), now), /prazo mínimo de resposta/);
      assert.equal(arenaDateInput(new Date("2026-10-14T01:30:00.000Z")), "2026-10-13");
      assert.equal(arenaDateInput(new Date("2026-10-14T03:00:00.000Z")), "2026-10-14");
      const today = arenaToday(new Date("2026-10-14T01:30:00.000Z"));
      assert.equal(`${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`, "2026-10-13");
    }
  } finally {
    if (originalTimeZone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimeZone;
  }
});
