import "server-only";

import { prisma } from "@/lib/prisma";

export async function getEventRadar() {
  return prisma.tournament.findMany({
    where: { showInEventRadar: true, registrationPhase: { in: ["REGISTRATIONS", "LIVE"] } },
    orderBy: [{ registrationPhase: "asc" }, { updatedAt: "desc" }],
    take: 80,
    select: {
      id: true, name: true, description: true, publicSlug: true, registrationPhase: true, creationMode: true,
      arena: { select: { name: true, logoUrl: true, city: true, state: true } },
      categories: { where: { active: true }, orderBy: { level: "asc" }, select: { id: true, name: true, gender: true } },
    },
  });
}
