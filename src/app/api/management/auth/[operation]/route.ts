import { NextRequest, NextResponse } from "next/server";
import { allowedFrontendOrigin } from "@/lib/backend/origin-policy";
import { readBoundedJson, RequestBodyTooLargeError } from "@/lib/http/json-body";
import { managementAuthOperations, managementInputSchemaFor, managementAuthOutcomeSchema } from "@/lib/backend/contracts/management-auth";
import { getArenaAccessDecision } from "@/lib/backend/services/management-session";
import * as access from "@/lib/backend/services/account-access";
import * as auth from "@/lib/backend/services/management-auth";

export const dynamic = "force-dynamic";
const operations = {
  invite: (form: FormData) => access.inviteArenaUserAction({ error: null, success: null }, form),
  'revoke-invite': access.revokeArenaInviteAction,
  'request-reset': (form: FormData) => access.requestPasswordResetAction({ error: null, success: null }, form),
  'send-user-recovery': (form: FormData) => access.sendArenaUserRecoveryAction({ error: null, success: null }, form),
  'complete-reset': (form: FormData) => access.completePasswordResetAction({ error: null, success: null }, form),
  'accept-invite': (form: FormData) => access.acceptArenaInviteAction({ error: null, success: null }, form),
  login: (form: FormData) => auth.loginAction({ error: null }, form),
  'register-arena': (form: FormData) => auth.registerArenaAction({ error: null }, form),
  logout: (_form: FormData) => auth.logoutAction(),
  'select-arena': auth.setActiveArenaAction,
  'select-workspace': auth.setWorkspaceAction,
} as const;
export async function POST(request: NextRequest, context: { params: Promise<{ operation: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!allowedFrontendOrigin(request.headers.get('origin'), process.env.VX4_FRONTEND_ORIGINS)) return NextResponse.json({ error: 'Forbidden origin' }, { status: 403, headers });
  const { operation } = await context.params;
  if (!managementAuthOperations.includes(operation as typeof managementAuthOperations[number])) return NextResponse.json({ error: 'Not found' }, { status: 404, headers });
  let values;
  try { values = managementInputSchemaFor(operation as typeof managementAuthOperations[number]).parse(await readBoundedJson(request, 16384)); }
  catch (error) { return NextResponse.json({ error: 'Invalid payload' }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400, headers }); }
  if (['invite', 'revoke-invite', 'send-user-recovery'].includes(operation)) {
    const decision = await getArenaAccessDecision();
    if (decision.redirectTo) return NextResponse.json({ error: null, success: null, redirectTo: decision.redirectTo }, { headers });
  }
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  try {
    const result = await operations[operation as keyof typeof operations](form);
    return NextResponse.json(managementAuthOutcomeSchema.parse(result), { headers });
  } catch (error) {
    if (error instanceof Error && error.message === 'Arena inválida para este usuário.') return NextResponse.json({ error: error.message }, { headers });
    throw error;
  }
}
