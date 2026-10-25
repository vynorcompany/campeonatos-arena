import { expirePortalCheckouts } from "@/lib/payments/portal-checkout-expiry";

let started = false;

/** Long-lived Node runtime only. Database claims also coordinate replicas. */
export function startPortalCheckoutExpiryWorker() {
  if (started) return;
  started = true;
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const result = await expirePortalCheckouts();
      if (result.failed) console.warn("Portal checkout expiry awaits provider confirmation", { failed: result.failed });
    } catch {
      console.error("Portal checkout expiry could not complete this run");
    } finally { running = false; }
  };
  const timer = setInterval(() => void tick(), 60_000);
  timer.unref();
}
