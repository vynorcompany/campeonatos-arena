import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/backend/services/management-session";
import { allowedFrontendOrigin } from "@/lib/backend/origin-policy";
import { readBoundedJson, RequestBodyTooLargeError } from "@/lib/http/json-body";
import { agencyBillingFields, agencyBillingInputSchema, type AgencyBillingOperation } from "@/lib/backend/contracts/agency-billing";
import { executeAgencyBillingMutation } from "@/lib/backend/services/agency-billing-mutations";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest, context: { params: Promise<{ operation: string }> }) {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  const fail = (error: string, status: number) => NextResponse.json({ error, changed: false }, { status, headers });
  if (!allowedFrontendOrigin(request.headers.get("origin"), process.env.VX4_FRONTEND_ORIGINS)) return fail("Origem não autorizada.", 403);
  const raw = (await context.params).operation;
  if (!Object.hasOwn(agencyBillingFields, raw)) return fail("Operação inválida.", 404);
  const auth = await requireAuth();
  if (!["ADMIN", "SUPER_ADMIN"].includes(auth.systemRole)) return fail("Somente administradores da agência podem alterar planos e assinaturas.", 403);
  const operation = raw as AgencyBillingOperation;
  let input;
  try { input = agencyBillingInputSchema(operation).parse(await readBoundedJson(request, 32 * 1024)); }
  catch (error) { return fail("Dados inválidos.", error instanceof RequestBodyTooLargeError ? 413 : 400); }
  try { return NextResponse.json(await executeAgencyBillingMutation(operation, input), { headers }); }
  catch { return fail("Não foi possível confirmar a alteração. Confira os dados antes de tentar novamente.", 500); }
}
