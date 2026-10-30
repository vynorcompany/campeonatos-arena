import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { issueRecurringOnlineCharges } from "@/lib/payments/recurring-online-charges";
import { issueDueAgencyInvoices } from "@/lib/services/agency-billing";
import { processPlanPriceChanges } from "@/lib/academy/plan-price-worker";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const secret = env.cronSecret;
  return Boolean(secret) && (request.headers.get("authorization") === `Bearer ${secret}` || request.headers.get("x-cron-secret") === secret);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const prices = await processPlanPriceChanges();
  if (prices.failed) return NextResponse.json({ ok: false, ...prices }, { status: 500 });
  const [arenaCharges, agencyCharges] = await Promise.allSettled([issueRecurringOnlineCharges(), issueDueAgencyInvoices()]);
  if (arenaCharges.status === "rejected") console.error("Arena recurring online charge job failed", arenaCharges.reason);
  if (agencyCharges.status === "rejected") console.error("Agency recurring online charge job failed", agencyCharges.reason);
  const ok = arenaCharges.status === "fulfilled" && agencyCharges.status === "fulfilled"
    && arenaCharges.value.failed === 0 && agencyCharges.value.agencyInvoiceFailures === 0
    && agencyCharges.value.agencyCheckoutFailures === 0;
  return NextResponse.json({
    ok,
    ...(arenaCharges.status === "fulfilled" ? arenaCharges.value : {}),
    ...(agencyCharges.status === "fulfilled" ? agencyCharges.value : {}),
  }, { status: ok ? 200 : 500 });
}
