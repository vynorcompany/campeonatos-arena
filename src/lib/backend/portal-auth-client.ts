import "server-only";
import { cookies, headers } from "next/headers";
import { backendOrigin } from "@/lib/backend/http-client";
import { athleteSessionCookie } from "@/lib/backend/auth-cookie";
import { publicAuthFields, publicAuthInputSchema, publicAuthOutcomeSchema, type PublicAuthOperation } from "@/lib/backend/contracts/player-auth";

export async function remotePortalAuthentication(origin: string, operation: PublicAuthOperation, form: FormData) {
  const values: Record<string, string> = {};
  for (const field of publicAuthFields) {
    const value = form.get(field);
    if (typeof value === 'string') values[field] = value;
  }
  const payload = publicAuthInputSchema.parse(values);
  const cookieStore = await cookies();
  const token = cookieStore.get('arena_player_session')?.value;
  const requestHeaders = new Headers({ 'Content-Type': 'application/json', Accept: 'application/json' });
  const browserOrigin = (await headers()).get('origin');
  if (browserOrigin) requestHeaders.set('origin', browserOrigin);
  if (token) requestHeaders.set('cookie', `arena_player_session=${encodeURIComponent(token)}`);
  const response = await fetch(new URL(`/api/portal/auth/${operation}`, backendOrigin(origin)), {
    method: 'POST', headers: requestHeaders, body: JSON.stringify(payload),
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error('Não foi possível validar o acesso. Tente novamente.');
  const result = publicAuthOutcomeSchema.parse(await response.json());
  // Parse every header before mutating the browser's session.
  const issuedCookies = response.headers.getSetCookie().map(athleteSessionCookie);
  for (const cookie of issuedCookies) cookieStore.set({ ...cookie, secure: process.env.NODE_ENV === 'production' });
  return result;
}
