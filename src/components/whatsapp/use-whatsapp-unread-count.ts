"use client";

import { useEffect, useState } from "react";

/** Keeps the sidebar current without refreshing the page or interrupting forms. */
export function useWhatsAppUnreadCount(initialCount: number, enabled: boolean) {
  const [count, setCount] = useState(initialCount);
  useEffect(() => { setCount(initialCount); }, [initialCount]);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let checking = false;
    const controller = new AbortController();
    const check = async () => {
      if (disposed || checking || document.visibilityState !== "visible") return;
      checking = true;
      try {
        const response = await fetch("/api/whatsapp/pulse", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const payload = await response.json();
        if (!disposed && Number.isSafeInteger(payload?.unreadCount) && payload.unreadCount >= 0) setCount(payload.unreadCount);
      } catch { /* Preserve the last known count while offline. */ }
      finally { checking = false; }
    };
    void check();
    const timer = window.setInterval(() => void check(), 2_000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      disposed = true;
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [enabled]);
  return count;
}
