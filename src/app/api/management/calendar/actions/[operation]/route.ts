import { NextRequest, NextResponse } from "next/server";
import { requireArenaAccess } from "@/lib/backend/services/management-session";
import { canPerformPermission } from "@/lib/permissions";
import { allowedFrontendOrigin } from "@/lib/backend/origin-policy";
import { readBoundedJson, RequestBodyTooLargeError } from "@/lib/http/json-body";
import { calendarManagementFields, calendarManagementInputSchema, type CalendarManagementOperation } from "@/lib/backend/contracts/calendar-management";
import { executeCalendarManagementMutation } from "@/lib/backend/services/calendar-management-mutations";
export const dynamic = "force-dynamic";
const safeErrors = new Set(["Evento invalido.", "Evento nao encontrado."]);
export async function POST(request: NextRequest, context: { params: Promise<{ operation: string }> }) {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  if (!allowedFrontendOrigin(request.headers.get("origin"), process.env.VX4_FRONTEND_ORIGINS)) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403, headers });
  const raw = (await context.params).operation;
  if (!Object.hasOwn(calendarManagementFields, raw)) return NextResponse.json({ error: "Operação inválida." }, { status: 404, headers });
  const operation = raw as CalendarManagementOperation;
  const auth = await requireArenaAccess();
  if (!canPerformPermission(operation === "client-create" ? "players:create" : "calendar:event:manage", auth.arenaRole, auth.systemRole, auth.editPermissions)) return NextResponse.json({ error: "Sem permissão para esta alteração." }, { status: 403, headers });
  let input;
  try { input = calendarManagementInputSchema(operation).parse(await readBoundedJson(request, 64 * 1024)); }
  catch (error) { return NextResponse.json({ error: "Dados inválidos." }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400, headers }); }
  try { return NextResponse.json(await executeCalendarManagementMutation(operation, input.fields), { headers }); }
  catch (error) { const safe = error instanceof Error && safeErrors.has(error.message); return NextResponse.json({ error: safe ? (error as Error).message : "Não foi possível confirmar a alteração. Confira os dados antes de tentar novamente." }, { status: safe ? 400 : 500, headers }); }
}
