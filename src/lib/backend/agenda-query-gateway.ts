import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { backendOrigin } from "./http-client";
import { managementCookieHeader } from "./management-context-client";
import { agendaAvailabilityInputSchema, agendaAvailabilitySchema, agendaVersionSchema } from "./contracts/agenda-queries";
import { agendaDayInputSchema } from "./contracts/agenda-day";
export async function forwardAgendaQuery(request: NextRequest, area: "availability" | "version") {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  const query = request.nextUrl.searchParams;
  const valid = (area === "availability" ? agendaAvailabilityInputSchema : agendaDayInputSchema).safeParse(Object.fromEntries(query));
  if (!valid.success || [...query.keys()].some(key => query.getAll(key).length !== 1)) return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400, headers });
  const origin = process.env.VX4_BACKEND_ORIGIN;
  if (!origin) return area === "availability" ? (await import("@/app/api/management/agenda/availability/route")).GET(request) : (await import("@/app/api/management/agenda/version/route")).GET(request);
  try {
    const cookie = await managementCookieHeader();
    const response = await fetch(new URL(`/api/management/agenda/${area}?${new URLSearchParams(valid.data)}`, backendOrigin(origin)), { headers: { Accept: "application/json", ...(cookie ? { cookie } : {}) }, cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(15000) });
    if ([301, 302, 303, 307, 308, 401].includes(response.status)) return NextResponse.json({ error: "Não autenticado." }, { status: 401, headers });
    if ([400, 403, 404].includes(response.status)) return NextResponse.json({ error: response.status === 403 ? "Sem acesso à grade." : "Parâmetros ou registro inválidos." }, { status: response.status, headers });
    if (!response.ok) throw new Error("Backend unavailable");
    const value: unknown = await response.json();
    const result = area === "availability" ? agendaAvailabilitySchema.parse(value) : agendaVersionSchema.parse(value);
    return NextResponse.json(result, { headers });
  } catch { return NextResponse.json({ error: "Não foi possível consultar a grade. Tente novamente." }, { status: 502, headers }); }
}
