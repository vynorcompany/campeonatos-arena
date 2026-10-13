import type { Prisma } from "@prisma/client";

export async function ensureTournamentPairFromRegistration(
  tx: Prisma.TransactionClient,
  input: {
    arenaId: string;
    tournamentId: string;
    leadName: string;
    partnerName: string;
    leadCpf?: string;
    partnerCpf?: string;
    leadPlayerId?: string;
    partnerPlayerId?: string;
  }
) {
  const leadName = input.leadName.trim();
  const partnerName = input.partnerName.trim();

  if (!leadName || !partnerName) {
    return;
  }

  async function resolvePlayer(name: string, cpfInput?: string, playerId?: string) {
    if (playerId) {
      const player = await tx.player.findFirst({ where: { id: playerId, arenaId: input.arenaId, mergedIntoPlayerId: null } });
      if (!player) throw new Error("Atleta da inscrição não encontrado nesta arena.");
      return player;
    }
    const cpf = (cpfInput ?? "").replace(/\D/g, "");
    const player = cpf.length === 11
      ? await tx.player.findFirst({ where: { arenaId: input.arenaId, cpf, mergedIntoPlayerId: null }, orderBy: [{ active: "desc" }, { createdAt: "asc" }, { id: "asc" }] })
      : await tx.player.findFirst({ where: { arenaId: input.arenaId, name, cpf: "", mergedIntoPlayerId: null }, orderBy: [{ active: "desc" }, { createdAt: "asc" }, { id: "asc" }] });
    return player ?? tx.player.create({ data: { arenaId: input.arenaId, name, cpf } });
  }

  const leadPlayer = await resolvePlayer(leadName, input.leadCpf, input.leadPlayerId);
  const partnerPlayer = await resolvePlayer(partnerName, input.partnerCpf, input.partnerPlayerId);
  if (leadPlayer.id === partnerPlayer.id) return;

  await tx.tournamentPlayer.upsert({
    where: {
      tournamentId_playerId: {
        tournamentId: input.tournamentId,
        playerId: leadPlayer.id
      }
    },
    create: {
      tournamentId: input.tournamentId,
      playerId: leadPlayer.id,
      seedPoints: leadPlayer.points
    },
    update: {}
  });

  await tx.tournamentPlayer.upsert({
    where: {
      tournamentId_playerId: {
        tournamentId: input.tournamentId,
        playerId: partnerPlayer.id
      }
    },
    create: {
      tournamentId: input.tournamentId,
      playerId: partnerPlayer.id,
      seedPoints: partnerPlayer.points
    },
    update: {}
  });

  const tournament = await tx.tournament.findUnique({
    where: { id: input.tournamentId },
    include: {
      entries: true,
      pairs: {
        include: {
          players: true
        }
      }
    }
  });

  if (!tournament) {
    return;
  }

  const existingPair = tournament.pairs.find((pair) => {
    const playerIds = pair.players.map((pairPlayer) => pairPlayer.playerId);
    return (
      playerIds.length === 2 &&
      playerIds.includes(leadPlayer.id) &&
      playerIds.includes(partnerPlayer.id)
    );
  });

  if (existingPair) {
    return;
  }

  const playersAlreadyPaired = new Set(
    tournament.pairs.flatMap((pair) => pair.players.map((pairPlayer) => pairPlayer.playerId))
  );

  if (playersAlreadyPaired.has(leadPlayer.id) || playersAlreadyPaired.has(partnerPlayer.id)) {
    return;
  }

  const entryByPlayerId = new Map(tournament.entries.map((entry) => [entry.playerId, entry]));
  const leadEntry = entryByPlayerId.get(leadPlayer.id);
  const partnerEntry = entryByPlayerId.get(partnerPlayer.id);

  if (!leadEntry || !partnerEntry) {
    return;
  }

  const createdPair = await tx.pair.create({
    data: {
      tournamentId: input.tournamentId,
      drawOrder: tournament.pairs.length + 1,
      name: `${leadName} / ${partnerName}`,
      totalPoints: 0
    }
  });

  await tx.pairPlayer.createMany({
    data: [
      {
        pairId: createdPair.id,
        playerId: leadPlayer.id,
        slot: 1
      },
      {
        pairId: createdPair.id,
        playerId: partnerPlayer.id,
        slot: 2
      }
    ]
  });

  await tx.tournament.update({
    where: { id: input.tournamentId },
    data: {
      status: "READY_FOR_DRAW"
    }
  });
}
