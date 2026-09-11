import "server-only";

import { prisma } from "@/lib/prisma";

export type DoublesRadar = {
  athletes: Array<{
    id: string;
    name: string;
    photoUrl: string;
    gender: string;
    category: string;
    padelSide: string;
    availability: "AVAILABLE" | "LOOKING_FOR_PARTNER";
  }>;
  categories: string[];
  genders: string[];
  selectedAthlete: {
    id: string;
    name: string;
    photoUrl: string;
    gender: string;
    category: string;
    padelSide: string;
    availability: "AVAILABLE" | "LOOKING_FOR_PARTNER";
  } | null;
};

export async function getPublicDoublesRadar(
  arenaSlug: string,
  currentPlayerId: string,
  filters: { gender?: string; category?: string; athleteId?: string } = {},
): Promise<DoublesRadar | null> {
  const arena = await prisma.arena.findUnique({ where: { slug: arenaSlug }, select: { id: true } });
  if (!arena) return null;

  const visiblePlayers = await prisma.player.findMany({
    where: {
      arenaId: arena.id,
      active: true,
      id: { not: currentPlayerId },
      tournamentAvailability: { in: ["AVAILABLE", "LOOKING_FOR_PARTNER"] },
      class: { not: "" },
    },
    select: { id: true, name: true, photoUrl: true, gender: true, class: true, padelSide: true, tournamentAvailability: true },
    orderBy: [{ class: "asc" }, { name: "asc" }],
  });

  const athletes = visiblePlayers.map((player) => ({
    id: player.id,
    name: player.name,
    photoUrl: player.photoUrl,
    gender: player.gender,
    category: player.class,
    padelSide: player.padelSide,
    availability: player.tournamentAvailability as "AVAILABLE" | "LOOKING_FOR_PARTNER",
  }));
  const categories = [...new Set(athletes.map((athlete) => athlete.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const genders = [...new Set(athletes.map((athlete) => athlete.gender).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const filteredAthletes = athletes.filter((athlete) =>
    (!filters.gender || athlete.gender === filters.gender) &&
    (!filters.category || athlete.category === filters.category),
  );

  return {
    athletes: filteredAthletes,
    categories,
    genders,
    selectedAthlete: athletes.find((athlete) => athlete.id === filters.athleteId) ?? null,
  };
}
