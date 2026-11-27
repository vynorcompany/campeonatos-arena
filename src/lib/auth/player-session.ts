import "server-only";
import { cookies } from "next/headers";
import { readBackendContract } from "@/lib/backend/http-client";
import { publicPlayerContextSchema } from "@/lib/backend/contracts/player-context";

// Session writes move with the authentication actions in the next migration.
export { createPublicPlayerSession, destroyPublicPlayerSession } from "@/lib/backend/services/player-session";

export async function getPublicPlayerContext(arenaSlug: string) {
  if (process.env.VX4_BACKEND_ORIGIN) {
    const token = (await cookies()).get("arena_player_session")?.value;
    return readBackendContract(process.env.VX4_BACKEND_ORIGIN,
      `/api/portal/session?arena=${encodeURIComponent(arenaSlug)}`, publicPlayerContextSchema,
      token ? { cookie: `arena_player_session=${encodeURIComponent(token)}` } : undefined);
  }
  const local = await import("@/lib/backend/services/player-session");
  return local.getPublicPlayerContext(arenaSlug);
}

export async function getPublicPlayerAuth(arenaSlug: string) {
  return (await getPublicPlayerContext(arenaSlug)).currentClient;
}

export async function getPublicAthleteIdentity() {
  return (await getPublicPlayerContext("")).athleteIdentity;
}

export async function requirePublicPlayerAuth(arenaSlug: string) {
  const auth = await getPublicPlayerAuth(arenaSlug);
  if (!auth) throw new Error("Entre na sua conta de cliente para realizar uma reserva.");
  return auth;
}
