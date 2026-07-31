import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicGameAgenda } from "../src/lib/public-standings";

test("groups public games by day and sorts them by time", () => {
  const agenda = buildPublicGameAgenda([
    {
      eventName: "Open",
      categoryName: "5ª M",
      label: "Jogo 2",
      stage: "GROUP",
      roundOrder: 2,
      scheduledDate: "2026-08-02",
      scheduledTime: "20:00",
      homePairName: "B",
      awayPairName: "C",
      finished: false,
    },
    {
      eventName: "Open",
      categoryName: "5ª M",
      label: "Jogo 1",
      stage: "GROUP",
      roundOrder: 1,
      scheduledDate: "2026-08-02",
      scheduledTime: "18:00",
      homePairName: "A",
      awayPairName: "D",
      finished: false,
    },
  ]);

  assert.deepEqual(agenda[0].games.map((game) => game.scheduledTime), [
    "18:00",
    "20:00",
  ]);
  assert.equal(agenda[0].date, "2026-08-02");
  assert.equal(agenda[0].label, "domingo, 02 de agosto");
});

test("sorts equal-time games by event, category, and round order", () => {
  const agenda = buildPublicGameAgenda([
    {
      eventName: "Beta Open",
      categoryName: "6ª M",
      label: "Jogo 2",
      stage: "GROUP",
      roundOrder: 2,
      scheduledDate: "2026-08-02",
      scheduledTime: "18:00",
      homePairName: "B",
      awayPairName: "C",
      finished: false,
    },
    {
      eventName: "Alpha Open",
      categoryName: "6ª M",
      label: "Jogo 2",
      stage: "GROUP",
      roundOrder: 2,
      scheduledDate: "2026-08-02",
      scheduledTime: "18:00",
      homePairName: "D",
      awayPairName: "E",
      finished: false,
    },
    {
      eventName: "Alpha Open",
      categoryName: "6ª M",
      label: "Jogo 1",
      stage: "GROUP",
      roundOrder: 1,
      scheduledDate: "2026-08-02",
      scheduledTime: "18:00",
      homePairName: "A",
      awayPairName: "F",
      finished: false,
    },
  ]);

  assert.deepEqual(agenda[0].games.map((game) => game.label), [
    "Jogo 1",
    "Jogo 2",
    "Jogo 2",
  ]);
  assert.deepEqual(agenda[0].games.map((game) => game.eventName), [
    "Alpha Open",
    "Alpha Open",
    "Beta Open",
  ]);
});

test("ignores finished games or games with incomplete scheduling", () => {
  const agenda = buildPublicGameAgenda([
    {
      eventName: "Open",
      categoryName: "5ª M",
      label: "Finalizada",
      stage: "FINAL",
      roundOrder: 1,
      scheduledDate: "2026-08-02",
      scheduledTime: "18:00",
      homePairName: "A",
      awayPairName: "B",
      finished: true,
    },
    {
      eventName: "Open",
      categoryName: "5ª M",
      label: "Sem horário",
      stage: "GROUP",
      roundOrder: 2,
      scheduledDate: "2026-08-02",
      scheduledTime: "",
      homePairName: "A",
      awayPairName: "B",
      finished: false,
    },
  ]);

  assert.equal(agenda.length, 0);
});
