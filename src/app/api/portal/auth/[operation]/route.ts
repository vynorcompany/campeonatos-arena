import { NextRequest, NextResponse } from "next/server";
import { publicAuthOperations, authInputSchemaFor, publicAuthOutcomeSchema } from "@/lib/backend/contracts/player-auth";
import { allowedFrontendOrigin } from "@/lib/backend/origin-policy";
import { readBoundedJson, RequestBodyTooLargeError } from "@/lib/http/json-body";
import * as emailAuth from "@/lib/backend/services/athlete-email-access";
import * as auth from "@/lib/backend/services/player-auth";

export const dynamic = "force-dynamic";
const operations = {
  'request-email-verification': emailAuth.requestAthleteEmailVerificationAction,
  'confirm-email': emailAuth.confirmAthleteEmailAction,
  'request-email-reset': emailAuth.requestAthleteEmailPasswordResetAction,
  'complete-email-reset': emailAuth.completeAthleteEmailPasswordResetAction,
  register: auth.registerPublicClientAction, 'confirm-registration': auth.confirmPublicClientRegistrationAction,
  login: auth.loginPublicClientAction, 'login-global': auth.loginGlobalAthleteAction,
  'request-reset': auth.requestPublicPasswordResetAction, 'confirm-reset': auth.confirmPublicPasswordResetAction,
  'request-global-reset': auth.requestGlobalPublicPasswordResetAction, 'confirm-global-reset': auth.confirmGlobalPublicPasswordResetAction,
} as const;

export async function POST(request: NextRequest, context: { params: Promise<{ operation: string }> }) {
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!allowedFrontendOrigin(request.headers.get('origin'), process.env.VX4_FRONTEND_ORIGINS)) return NextResponse.json({ error: 'Forbidden origin' }, { status: 403, headers });
  const { operation } = await context.params;
  if (!publicAuthOperations.includes(operation as typeof publicAuthOperations[number])) return NextResponse.json({ error: 'Not found' }, { status: 404, headers });
  let values;
  try { values = authInputSchemaFor(operation as typeof publicAuthOperations[number]).parse(await readBoundedJson(request, 16384)); }
  catch (error) { return NextResponse.json({ error: 'Invalid payload' }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400, headers }); }
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  const result = operation === 'logout' ? await auth.logoutPublicClientAction(form)
    : operation === 'logout-portal' ? await auth.logoutAthletePortalAction(form)
    : await operations[operation as keyof typeof operations]({ error: null }, form);
  return NextResponse.json(publicAuthOutcomeSchema.parse(result), { headers });
}
