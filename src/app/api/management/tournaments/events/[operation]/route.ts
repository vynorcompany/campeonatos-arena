import { NextRequest, NextResponse } from "next/server";
import { requireArenaAccess } from "@/lib/backend/services/management-session";
import { canPerformPermission } from "@/lib/permissions";
import { allowedFrontendOrigin } from "@/lib/backend/origin-policy";
import { readBoundedJson, RequestBodyTooLargeError } from "@/lib/http/json-body";
import { tournamentEventFields, tournamentEventInputSchema, type TournamentEventOperation } from "@/lib/backend/contracts/tournament-events";
import { executeTournamentEventMutation } from "@/lib/backend/services/tournament-event-mutations";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest, context: { params: Promise<{ operation: string }> }) {
 const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
 const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers });
 if (!allowedFrontendOrigin(request.headers.get("origin"), process.env.VX4_FRONTEND_ORIGINS)) return fail("Origem não autorizada.", 403);
 const auth = await requireArenaAccess();
 if (!canPerformPermission("tournaments:manage", auth.arenaRole, auth.systemRole, auth.editPermissions)) return fail("Sem permissão para gerenciar eventos.", 403);
 const raw = (await context.params).operation;
 if (!Object.hasOwn(tournamentEventFields, raw)) return fail("Operação inválida.", 404);
 const operation = raw as TournamentEventOperation; let input;
 try { input = tournamentEventInputSchema(operation).parse(await readBoundedJson(request, 256 * 1024)); } catch (error) { return fail("Dados inválidos.", error instanceof RequestBodyTooLargeError ? 413 : 400); }
 try { return NextResponse.json(await executeTournamentEventMutation(operation, input), { headers }); } catch { return fail("Não foi possível confirmar a alteração. Confira o evento antes de tentar novamente.", 500); }
}
