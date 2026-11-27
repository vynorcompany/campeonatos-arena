import "server-only";
import { cookies, headers } from "next/headers";
import { backendOrigin } from "@/lib/backend/http-client";
import { managementAuthenticationCookie } from "@/lib/backend/management-auth-cookie";
import { managementFieldsFor, managementInputSchemaFor, managementAuthOutcomeSchema, type ManagementAuthOperation } from "@/lib/backend/contracts/management-auth";

export async function remoteManagementAuthentication(origin: string, operation: ManagementAuthOperation, form: FormData) {
  const values: Record<string, string> = {};
  for (const name of managementFieldsFor(operation)) {
    const value = form.get(name);
    if (typeof value === 'string') values[name] = value;
  }
  const payload = managementInputSchemaFor(operation).parse(values);
  const names = [process.env.SESSION_COOKIE_NAME || 'padel_session', process.env.ARENA_COOKIE_NAME || 'padel_arena'];
  const store = await cookies();
  const cookie = names.map(name => {
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,80}$/.test(name)) throw new Error('Invalid session cookie configuration');
    const value = store.get(name)?.value;
    return value ? `${name}=${encodeURIComponent(value)}` : null;
  }).filter(Boolean).join('; ');
  const original = await headers();
  const requestHeaders = new Headers({ 'Content-Type': 'application/json', Accept: 'application/json' });
  for (const name of ['origin', 'user-agent']) {
    const value = original.get(name);
    if (value) requestHeaders.set(name, value);
  }
  if (cookie) requestHeaders.set('cookie', cookie);
  const response = await fetch(new URL(`/api/management/auth/${operation}`, backendOrigin(origin)), {
    method: 'POST', headers: requestHeaders, body: JSON.stringify(payload),
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error('Não foi possível validar o acesso. Tente novamente.');
  const result = managementAuthOutcomeSchema.parse(await response.json());
  const issued = response.headers.getSetCookie().map(value => managementAuthenticationCookie(value, names[0], names[1]));
  for (const value of issued) store.set({ ...value, secure: process.env.NODE_ENV === 'production' });
  return result;
}
