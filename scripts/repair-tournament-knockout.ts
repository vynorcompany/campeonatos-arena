import { existsSync } from "node:fs";
import { prisma } from "../src/lib/prisma";
import { repairTournamentKnockout } from "../src/lib/services/tournament";

if (typeof process.loadEnvFile === "function" && existsSync(".env")) {
  process.loadEnvFile(".env");
}

function getArgValue(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

async function main() {
  const tournamentId = getArgValue("--tournament");
  const arenaId = getArgValue("--arena");
  const finish = process.argv.includes("--finish");

  if (!tournamentId || !arenaId) {
    throw new Error("Uso: tsx scripts/repair-tournament-knockout.ts --tournament <id> --arena <id> [--finish]");
  }

  await repairTournamentKnockout(tournamentId, arenaId, {
    finishTournamentIfChampionDefined: finish
  });

  const final = await prisma.match.findFirst({
    where: {
      tournamentId,
      stage: "FINAL"
    },
    select: {
      id: true,
      homePairId: true,
      awayPairId: true,
      winnerPairId: true
    }
  });

  const tournament = await prisma.tournament.findUnique({
    where: {
      id: tournamentId
    },
    select: {
      status: true
    }
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        tournamentId,
        final,
        tournamentStatus: tournament?.status ?? null
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
