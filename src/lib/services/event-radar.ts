import "server-only";
import { prisma } from "@/lib/prisma";
export type PublicRadarEvent = { id: string; name: string; description: string; publicSlug: string; registrationPhase: string; creationMode: string; arena: { name: string; logoUrl: string; city: string; state: string }; categories: { id: string; name: string; gender: string }[] };
export async function getEventRadar(): Promise<PublicRadarEvent[]> {
  const [result] = await prisma.$queryRaw<{ events: PublicRadarEvent[] }[]>`SELECT public.public_event_radar() AS events`;
  return result?.events ?? [];
}
