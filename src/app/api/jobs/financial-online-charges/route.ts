import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { issueRecurringOnlineCharges } from "@/lib/payments/recurring-online-charges";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const secret = env.cronSecret;
  return Boolean(secret) && (request.headers.get("authorization") === `Bearer ${secret}` || request.headers.get("x-cron-secret") === secret);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await issueRecurringOnlineCharges()) });
  } catch (error) {
    console.error("Financial recurring online charge job failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
