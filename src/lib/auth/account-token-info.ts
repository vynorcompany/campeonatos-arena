import "server-only";
import { backendOrigin } from "@/lib/backend/http-client";
import { accountTokenInfoInputSchema, accountTokenInfoSchema } from "@/lib/backend/contracts/account-token-info";

export async function getAccountTokenInfo(kind: 'INVITE' | 'RESET', token: string) {
  if (!accountTokenInfoInputSchema.safeParse({ kind, token }).success) return { valid: false, invitation: null };
  if (process.env.VX4_BACKEND_ORIGIN) {
    const response = await fetch(new URL('/api/management/account/token-info', backendOrigin(process.env.VX4_BACKEND_ORIGIN)), {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ kind, token }), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error('Não foi possível validar o link. Tente novamente.');
    return accountTokenInfoSchema.parse(await response.json());
  }
  const local = await import('@/lib/backend/services/account-token-info');
  return local.resolveAccountTokenInfo(kind, token);
}
