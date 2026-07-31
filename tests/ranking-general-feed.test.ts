import test from "node:test";
import assert from "node:assert/strict";
import { createRankingProfileSchema } from "@/lib/validators/ranking";
import { buildGeneralRankingSourceEntries } from "@/lib/ranking/general-feed";

test("aceita alimentacao do Geral somente para ranking de duplas", () => {
  assert.equal(
    createRankingProfileSchema.safeParse({
      name: "Liga A",
      type: "PAIR",
      model: "LEAGUE",
      feedsGeneralRanking: true,
      championPoints: 10,
      runnerUpPoints: 8,
      thirdPoints: 6,
      participationPoints: 2,
    }).success,
    true,
  );

  assert.equal(
    createRankingProfileSchema.safeParse({
      name: "Geral",
      type: "INDIVIDUAL",
      model: "KNOCKOUT",
      feedsGeneralRanking: true,
      championPoints: 10,
      runnerUpPoints: 8,
      semifinalPoints: 6,
      quarterfinalPoints: 4,
      participationPoints: 2,
    }).success,
    false,
  );
});

test("General Ranking includes credited players from finished pair feeds", () => {
  const entries = buildGeneralRankingSourceEntries([
    {
      totalPoints: 24,
      players: [
        {
          playerId: "ana",
          player: { name: "Ana", active: true, photoUrl: "/ana.jpg" },
        },
        {
          playerId: "bia",
          player: { name: "Bia", active: true, photoUrl: "/bia.jpg" },
        },
      ],
      competition: {
        status: "FINISHED",
        application: { feedsGeneralRanking: true },
        category: {
          tournament: {
            id: "event-1",
            name: "Open Arena",
            status: "FINISHED",
            createdAt: new Date("2026-07-01T12:00:00Z"),
          },
        },
      },
    },
    {
      totalPoints: 99,
      players: [
        {
          playerId: "clara",
          player: { name: "Clara", active: true, photoUrl: "/clara.jpg" },
        },
      ],
      competition: {
        status: "FINISHED",
        application: { feedsGeneralRanking: false },
        category: {
          tournament: {
            id: "event-2",
            name: "Copa Arena",
            status: "FINISHED",
            createdAt: new Date("2026-07-02T12:00:00Z"),
          },
        },
      },
    },
  ]);

  assert.deepEqual(
    entries.map((entry) => ({ playerId: entry.playerId, points: entry.tournamentPoints })),
    [
      { playerId: "ana", points: 24 },
      { playerId: "bia", points: 24 },
    ],
  );
});
