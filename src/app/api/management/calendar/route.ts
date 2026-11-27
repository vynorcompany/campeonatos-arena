import { NextRequest, NextResponse } from "next/server";
import { requireArenaAccess } from "@/lib/backend/services/management-session";
import { canViewModule } from "@/lib/permissions";
import { calendarEventsInputSchema } from "@/lib/backend/contracts/calendar-events";
import { resolveCalendarEvents } from "@/lib/backend/services/calendar-events-data";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const auth = await requireArenaAccess();
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  if (!canViewModule("calendar", auth.arenaRole, auth.systemRole, auth.viewPermissions)) return NextResponse.json({ error: "Sem acesso ao calendário." }, { status: 403, headers });
  const query = request.nextUrl.searchParams;
  const parsed = calendarEventsInputSchema.safeParse(Object.fromEntries(query));
  if (!parsed.success || query.getAll("start").length !== 1 || query.getAll("end").length !== 1) return NextResponse.json({ error: "Período inválido." }, { status: 400, headers });
  return NextResponse.json(await resolveCalendarEvents(auth.arenaId, parsed.data), { headers });
}
