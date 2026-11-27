import { NextRequest, NextResponse } from "next/server";
import { requireArenaAccess } from "@/lib/backend/services/management-session";
import { canPerformPermission } from "@/lib/permissions";
import { allowedFrontendOrigin } from "@/lib/backend/origin-policy";
import { readBoundedJson, RequestBodyTooLargeError } from "@/lib/http/json-body";
import { courtBookingFields, courtBookingInputSchema, type CourtBookingOperation } from "@/lib/backend/contracts/court-booking";
import { executeCourtBookingMutation } from "@/lib/backend/services/court-booking-mutations";
import { parseBookingParticipants } from "@/lib/calendar/inputs";
export const dynamic = "force-dynamic";
const safeErrors = new Set([
  "A data final da reserva fixa deve ser igual ou posterior ao primeiro horário.",
  "Esta reserva foi dividida entre clientes. Concilie as partes no financeiro antes de cancelar a reserva.",
  "Esta reserva foi dividida entre clientes. Concilie as partes no financeiro antes de cancelar cobranças.",
  "Esta reserva já foi confirmada ou não foi encontrada.",
  "Este horário já foi cancelado ou não foi encontrado.",
  "Este horário é gerenciado pela origem e não pode ser cancelado pela agenda.",
  "Horário inválido.",
  "Há uma cobrança emitida por outro provedor. A reserva não foi cancelada.",
  "Há uma cobrança online sendo emitida. Aguarde a confirmação antes de cancelar a reserva e a cobrança.",
  "Informe até quando a reserva fixa deve se repetir.",
  "Já existe um agendamento nessa quadra para este horário.",
  "Não foi possível confirmar o status de uma cobrança online. A reserva não foi cancelada.",
  "Professor não encontrado.",
  "Quadra não encontrada.",
  "Receba os serviços separadamente na comanda antes de usar o saldo de reservas.",
  "Reserva inválida.",
  "Saldo do cliente insuficiente.",
  "Selecione o professor responsável.",
  "Selecione pelo menos um cliente antes de salvar a reserva.",
  "Selecione um participante como responsável pela reserva.",
  "Um crédito de reserva cobre apenas uma quadra.",
  "Um ou mais atletas não pertencem à arena.",
  "Um valor com recebimento já registrado não pode ser alterado pela grade. Ajuste pelo financeiro.",
  "Uma cobrança online mudou durante o cancelamento. Atualize a página e tente novamente.",
  "Uma ou mais quadras não pertencem à arena."
]);
export async function POST(request: NextRequest, context: { params: Promise<{ operation: string }> }) {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  if (!allowedFrontendOrigin(request.headers.get("origin"), process.env.VX4_FRONTEND_ORIGINS)) return NextResponse.json({ error: "Origem não autorizada." }, { status: 403, headers });
  const raw = (await context.params).operation;
  if (!Object.hasOwn(courtBookingFields, raw)) return NextResponse.json({ error: "Operação inválida." }, { status: 404, headers });
  const operation = raw as CourtBookingOperation;
  const auth = await requireArenaAccess();
  let input;
  try { input = courtBookingInputSchema(operation).parse(await readBoundedJson(request, 128 * 1024)); }
  catch (error) { return NextResponse.json({ error: "Dados inválidos." }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400, headers }); }
  const fields = input.fields;
  const permission = operation === "confirm" ? "calendar:booking:edit" : operation === "cancel" ? fields.mode?.[0] === "FREE" ? "calendar:recurrence:release" : "calendar:booking:cancel" : fields.occurrenceId?.[0]?.trim() ? "calendar:booking:edit" : "calendar:booking:create";
  if (!canPerformPermission(permission, auth.arenaRole, auth.systemRole, auth.editPermissions)) return NextResponse.json({ error: "Sem permissão para esta alteração." }, { status: 403, headers });
  if (operation === "save") {
    let participants;
    try { participants = parseBookingParticipants(fields.participants?.[0] ?? "[]"); }
    catch { return NextResponse.json({ error: "Participantes inválidos." }, { status: 400, headers }); }
    if (participants.some(participant => (participant.amountCents > 0 || participant.paymentMethod === "RESERVATION_CREDIT") && participant.paymentMethod) && !canPerformPermission("finance:receivable:settle", auth.arenaRole, auth.systemRole, auth.editPermissions)) return NextResponse.json({ error: "Sem permissão para receber pagamentos." }, { status: 403, headers });
  }
  try { return NextResponse.json(await executeCourtBookingMutation(operation, fields), { headers }); }
  catch (error) { const safe = error instanceof Error && safeErrors.has(error.message); return NextResponse.json({ error: safe ? (error as Error).message : "Não foi possível confirmar a alteração. Confira a grade antes de tentar novamente." }, { status: safe ? 400 : 500, headers }); }
}
