import { NextRequest, NextResponse } from "next/server";
import { readBoundedJson, RequestBodyTooLargeError } from "@/lib/http/json-body";
import { accountTokenInfoInputSchema, accountTokenInfoSchema } from "@/lib/backend/contracts/account-token-info";
import { resolveAccountTokenInfo } from "@/lib/backend/services/account-token-info";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  const headers = { 'Cache-Control': 'private, no-store' };
  let input;
  try { input = accountTokenInfoInputSchema.parse(await readBoundedJson(request, 1024)); }
  catch (error) { return NextResponse.json({ error: 'Invalid token request' }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400, headers }); }
  // Read-only bearer-token lookup. Keep the token in the body, never in API URLs or audit paths.
  const result = await resolveAccountTokenInfo(input.kind, input.token);
  return NextResponse.json(accountTokenInfoSchema.parse(result), { headers });
}
