"use client";
import { useEffect, useState } from "react";
import { subscribeWhatsAppPulse } from "./whatsapp-pulse";
/** Uses the same lightweight request as the inbox, with slower idle polling. */
export function useWhatsAppUnreadCount(initialCount: number, enabled: boolean, scope = "") {
  const [count, setCount] = useState(initialCount);
  useEffect(() => { setCount(initialCount); }, [initialCount]);
  useEffect(() => {
    if (!enabled) return;
    return subscribeWhatsAppPulse(scope, pulse => setCount(pulse.unreadCount), 10_000);
  }, [enabled, scope]);
  return count;
}
