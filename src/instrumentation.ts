export async function register() {
  if (process.env.NEXT_PHASE !== "phase-production-build" && process.env.NEXT_RUNTIME === "nodejs" && process.env.PLAN_PRICE_WORKER_ENABLED !== "false") {
    const { startPlanPriceWorker } = await import("./lib/academy/plan-price-worker");
    startPlanPriceWorker();
  }
  if (process.env.NEXT_PHASE !== "phase-production-build" && process.env.NEXT_RUNTIME === "nodejs" && process.env.LESSON_CREDIT_WORKER_ENABLED !== "false") { const { startLessonCreditWorker } = await import("./lib/academy/lesson-credit-worker"); startLessonCreditWorker(); }
  if (process.env.NEXT_PHASE !== "phase-production-build" && process.env.NEXT_RUNTIME === "nodejs" && process.env.PORTAL_CHECKOUT_EXPIRY_WORKER_ENABLED === "true") {
    const { startPortalCheckoutExpiryWorker } = await import("./lib/payments/portal-checkout-expiry-worker");
    startPortalCheckoutExpiryWorker();
  }
}
