import "server-only";

import { prisma } from "@/lib/prisma";

export type DoublesRadar = {
  athletes: Array<{
    id: string;
    name: string;
    photoUrl: string;
    gender: string;
    categories: string[];
    padelSide: string;
    availability: "AVAILABLE" | "LOOKING_FOR_PARTNER";
  }>;
  categories: string[];
  genders: string[];
  notifications: Array<{ id: string; title: string; message: string; href: string }>;
  selectedAthlete: {
    id: string;
    name: string;
    photoUrl: string;
    gender: string;
    categories: string[];
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

  const [visiblePlayers, notifications] = await Promise.all([prisma.player.findMany({
    where: {
      arenaId: arena.id,
      active: true,
      id: { not: currentPlayerId },
      tournamentAvailability: { in: ["AVAILABLE", "LOOKING_FOR_PARTNER"] },
    },
    select: { id: true, name: true, photoUrl: true, gender: true, class: true, padelCategories: true, padelSide: true, tournamentAvailability: true },
    orderBy: [{ class: "asc" }, { name: "asc" }],
  }), prisma.playerNotification.findMany({
    where: { playerId: currentPlayerId, type: "DOUBLES_REQUEST", readAt: null },
    select: { id: true, title: true, message: true, href: true },
    orderBy: { createdAt: "desc" },
    take: 8,
  })]);

  const parseCategories = (value: string, fallback: string) => {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim());
    } catch {}
    return fallback.trim() ? [fallback.trim()] : [];
  };
  const athletes = visiblePlayers.map((player) => ({
    id: player.id,
    name: player.name,
    photoUrl: player.photoUrl,
    gender: player.gender,
    categories: parseCategories(player.padelCategories, player.class),
    padelSide: player.padelSide,
    availability: player.tournamentAvailability as "AVAILABLE" | "LOOKING_FOR_PARTNER",
  }));
  const eligibleAthletes = athletes.filter((athlete) => athlete.categories.length);
  const categories = [...new Set(eligibleAthletes.flatMap((athlete) => athlete.categories))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const genders = [...new Set(athletes.map((athlete) => athlete.gender).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const filteredAthletes = eligibleAthletes.filter((athlete) =>
    (!filters.gender || athlete.gender === filters.gender) &&
    (!filters.category || athlete.categories.includes(filters.category)),
  );

  return {
    athletes: filteredAthletes,
    categories,
    genders,
    notifications,
    selectedAthlete: eligibleAthletes.find((athlete) => athlete.id === filters.athleteId) ?? null,
  };
}
