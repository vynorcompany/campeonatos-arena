import { NextRequest } from "next/server";
import { forwardAgendaQuery } from "@/lib/backend/agenda-query-gateway";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) { return forwardAgendaQuery(request, "availability"); }
