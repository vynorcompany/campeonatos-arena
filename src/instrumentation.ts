export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.PORTAL_CHECKOUT_EXPIRY_WORKER_ENABLED === "true") {
    const { startPortalCheckoutExpiryWorker } = await import("./lib/payments/portal-checkout-expiry-worker");
    startPortalCheckoutExpiryWorker();
  }
}
