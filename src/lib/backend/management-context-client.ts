import "server-only";
import { cookies } from "next/headers";
import { readBackendContract } from "@/lib/backend/http-client";
import { managementContextResponseSchema } from "@/lib/backend/contracts/management-context";

export async function managementCookieHeader() {
  const store = await cookies();
  const names = [process.env.SESSION_COOKIE_NAME || 'padel_session', process.env.ARENA_COOKIE_NAME || 'padel_arena'];
  const pairs = names.map(name => {
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,80}$/.test(name)) throw new Error('Invalid session cookie configuration');
    const value = store.get(name)?.value;
    return value ? `${name}=${encodeURIComponent(value)}` : null;
  }).filter((value): value is string => value !== null);
  return pairs.length ? pairs.join('; ') : undefined;
}

export async function readManagementContext(origin: string, arenaAccess = false) {
  const cookie = await managementCookieHeader();
  return readBackendContract(origin, `/api/management/context${arenaAccess ? '?access=arena' : ''}`,
    managementContextResponseSchema, cookie ? { cookie } : undefined);
}
