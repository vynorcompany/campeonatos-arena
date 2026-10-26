import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/session";
import { canViewModule } from "@/lib/permissions";
import { withArenaTransaction } from "@/lib/rls";
import { agendaVersion, agendaVersionSelect } from "@/lib/calendar/agenda-version";
import { activeCourtOccurrenceWhere } from "@/lib/calendar/online-booking-hold";
export async function GET(request: Request) {
  const auth = await getAuthContext();
  if (!auth?.arenaId) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!canViewModule("calendar", auth.arenaRole, auth.systemRole, auth.viewPermissions)) return NextResponse.json({ error: "Sem acesso." }, { status: 403 });
  const arenaId = auth.arenaId;
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Data inválida." }, { status: 400 });
  const start = new Date(`${date}T00:00:00`); const end = new Date(start); end.setDate(end.getDate() + 1);
  if (!Number.isFinite(start.getTime())) return NextResponse.json({ error: "Data inválida." }, { status: 400 });
  const rows = await withArenaTransaction(arenaId, tx => tx.scheduleOccurrence.findMany({ where: { arenaId, ...activeCourtOccurrenceWhere(), startsAt: { lt: end }, endsAt: { gt: start } }, select: agendaVersionSelect, orderBy: [{ startsAt: "asc" }, { id: "asc" }] }), { maxWait: 10_000, timeout: 5_000 });
  return NextResponse.json({ version: agendaVersion(rows) }, { headers: { "Cache-Control": "no-store" } });
}
