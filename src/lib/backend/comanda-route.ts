import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getArenaAccessDecision } from "./services/management-session";
import { getPublicPlayerAuth } from "./services/player-session";
import { canPerformPermission } from "@/lib/permissions";
import { allowedFrontendOrigin } from "./origin-policy";
import { readBoundedJson, RequestBodyTooLargeError } from "@/lib/http/json-body";
import { comandaFields, comandaInputSchema, portalComandaOperations, type ComandaOperation } from "./contracts/comanda";
import { executeComandaMutation } from "./services/comanda-mutations";
import { publicComandaError } from "./comanda-operation-error";
const permissions = { create: "pos:command:create", "open-bookings": "pos:command:create", "add-product": "pos:command:items", "item-quantity": "pos:command:items", "item-edit": "pos:command:items", finish: "pos:command:finish", "confirm-request": "pos:command:items" } as const;
export async function handleComandaMutation(request: NextRequest, raw: string, portal: boolean) {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers });
  if (!allowedFrontendOrigin(request.headers.get("origin"), process.env.VX4_FRONTEND_ORIGINS)) return fail("Origem não autorizada.", 403);
  if (!Object.hasOwn(comandaFields, raw) || portalComandaOperations.includes(raw as ComandaOperation) !== portal) return fail("Operação inválida.", 404);
  const operation = raw as ComandaOperation;
  let input;
  try { input = comandaInputSchema(operation).parse(await readBoundedJson(request, 512 * 1024)); }
  catch (error) { return fail("Dados inválidos.", error instanceof RequestBodyTooLargeError ? 413 : 400); }
  if (portal) {
    if (!await getPublicPlayerAuth(input.fields.arenaSlug[0].trim())) return fail("Entre na sua conta para acessar as comandas.", 401);
  } else {
    const decision = await getArenaAccessDecision();
    const auth = decision.auth;
    if (!auth) return fail("Acesso à arena indisponível.", decision.redirectTo === "/login" ? 401 : 403);
    const allowed = operation === "delete"
      ? ["ADMIN", "SUPER_ADMIN"].includes(auth.systemRole) || ["ADMIN", "OWNER"].includes(auth.arenaRole ?? "")
      : Object.hasOwn(permissions, operation) && canPerformPermission(permissions[operation as keyof typeof permissions], auth.arenaRole, auth.systemRole, auth.editPermissions);
    if (!allowed) return fail("Sem permissão para esta operação.", 403);
  }
  try { return NextResponse.json(await executeComandaMutation(operation, input.fields), { headers }); }
  catch (error) {
    const message = publicComandaError(error);
    return fail(message ?? (error instanceof ZodError || error instanceof SyntaxError ? "Revise os campos da comanda." : "Não foi possível confirmar a operação. Confira a comanda antes de tentar novamente."), message || error instanceof ZodError || error instanceof SyntaxError ? 400 : 500);
  }
}
