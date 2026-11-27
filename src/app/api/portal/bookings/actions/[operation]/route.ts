import { NextRequest, NextResponse } from "next/server";
import { getPublicPlayerAuth } from "@/lib/backend/services/player-session";
import { allowedFrontendOrigin } from "@/lib/backend/origin-policy";
import { readBoundedJson, RequestBodyTooLargeError } from "@/lib/http/json-body";
import { publicCourtBookingFields, publicCourtBookingInputSchema, type PublicCourtBookingOperation } from "@/lib/backend/contracts/public-court-booking";
import { executePublicCourtBookingMutation } from "@/lib/backend/services/public-court-booking-mutations";
export const dynamic = "force-dynamic";
const safeErrors = new Set(["Arena não encontrada.", "A reserva online está desabilitada pela arena.", "Quadra não encontrada.", "Este horário não pertence à grade de reservas da quadra.", "A duração deve respeitar o intervalo configurado para a quadra.", "Este horário não está disponível para reserva online.", "Cliente não encontrado.", "Informe seu e-mail no perfil para continuar com o pagamento online.", "Solicitação de reserva inválida.", "Arena não encontrada.", "Esta solicitação não pode mais ser cancelada. Se você iniciou o pagamento, aguarde a confirmação ou o fim do prazo de 15 minutos.", "Dados do pagamento inválidos.", "Arena não encontrada.", "O prazo de 15 minutos desta reserva terminou. Escolha novamente o horário disponível.", "Informe seu e-mail no perfil para continuar com o pagamento online.", "Não foi possível abrir o pagamento escolhido."]);
export async function POST(request: NextRequest, context: { params: Promise<{ operation: string }> }) {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  const fail = (error: string, status: number) => NextResponse.json({ error, result: null }, { status, headers });
  if (!allowedFrontendOrigin(request.headers.get("origin"), process.env.VX4_FRONTEND_ORIGINS)) return fail("Origem não autorizada.", 403);
  const raw = (await context.params).operation;
  if (!Object.hasOwn(publicCourtBookingFields, raw)) return fail("Operação inválida.", 404);
  const operation = raw as PublicCourtBookingOperation;
  let input;
  try { input = publicCourtBookingInputSchema(operation).parse(await readBoundedJson(request, 16384)); }
  catch (error) { return fail("Dados inválidos.", error instanceof RequestBodyTooLargeError ? 413 : 400); }
  const auth = await getPublicPlayerAuth(input.fields.arenaSlug[0]);
  if (!auth) return fail("Entre na sua conta de cliente para realizar uma reserva.", 401);
  try { return NextResponse.json(await executePublicCourtBookingMutation(operation, input.fields), { headers }); }
  catch (error) {
    const message = error instanceof Error ? error.message : "";
    const boletoPrefix = "Para emitir boleto, complete no perfil: ";
    const boletoFields = new Set(["e-mail", "CPF com 11 dígitos", "CNPJ com 14 posições", "CEP", "rua", "número", "bairro", "cidade", "UF", "emissor de boletos compatível com CNPJ alfanumérico (a integração atual aceita CNPJ numérico)"]);
    const missingProfile = message.startsWith(boletoPrefix) && message.endsWith(".") && message.slice(boletoPrefix.length, -1).split(", ").every(field => boletoFields.has(field));
    const safe = safeErrors.has(message) || missingProfile || /^Este horário exige antecedência mínima de \d+ minutos\.$/.test(message);
    return fail(safe ? message : "Não foi possível confirmar a operação. Confira suas reservas antes de tentar novamente.", safe ? 400 : 500);
  }
}
