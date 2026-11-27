import { cache } from "react";
import { redirect } from "next/navigation";
import { readManagementContext } from "@/lib/backend/management-context-client";
import type { ManagementAuthContext } from "@/lib/backend/contracts/management-context";
export type AuthContext = ManagementAuthContext;

const cachePerRequest: typeof cache = typeof cache === "function" ? cache : (callback => callback);

const remoteArenaContext = cachePerRequest((origin: string) => readManagementContext(origin, true));

export const getAuthContext = cachePerRequest(async (): Promise<AuthContext | null> => {
  if (process.env.VX4_BACKEND_ORIGIN) return (await readManagementContext(process.env.VX4_BACKEND_ORIGIN)).auth;
  const local = await import("@/lib/backend/services/management-session");
  return local.getAuthContext();
});

export async function requireAuth() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  return auth;
}

export async function requireArenaAccess() {
  if (process.env.VX4_BACKEND_ORIGIN) {
    const result = await remoteArenaContext(process.env.VX4_BACKEND_ORIGIN);
    if (result.redirectTo) redirect(result.redirectTo);
    if (!result.auth?.arenaId) redirect("/login");
    return result.auth as AuthContext & { arenaId: string; arenaName: string | null };
  }
  const local = await import("@/lib/backend/services/management-session");
  return local.requireArenaAccess();
}
