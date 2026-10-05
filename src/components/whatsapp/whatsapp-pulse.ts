"use client";
import { createSharedPolling } from "@/lib/client-polling";
export type WhatsAppPulse = { version: string; unreadCount: number };
const stores = new Map<string, { store: ReturnType<typeof createSharedPolling<WhatsAppPulse>>; users: number }>();
export function subscribeWhatsAppPulse(scope: string, callback: (pulse: WhatsAppPulse) => void, interval: number) {
  let entry = stores.get(scope);
  if (!entry) {
    entry = { users: 0, store: createSharedPolling<WhatsAppPulse>({
      visible: () => document.visibilityState === "visible" && navigator.onLine !== false,
      fetch: async signal => {
        const response = await fetch("/api/whatsapp/pulse", { cache: "no-store", signal });
        if (!response.ok) return null;
        const value = await response.json();
        return typeof value.version === "string" && Number.isSafeInteger(value.unreadCount) && value.unreadCount >= 0 ? value : null;
      },
      schedule: (callback, delay) => window.setTimeout(callback, delay), cancel: timer => window.clearTimeout(timer as number),
    }) };
    stores.set(scope, entry);
    document.addEventListener("visibilitychange", entry.store.wake);
    window.addEventListener("focus", entry.store.wake);
    window.addEventListener("online", entry.store.wake);
  }
  entry.users++;
  const unsubscribe = entry.store.subscribe(callback, interval);
  return () => {
    unsubscribe();
    if (--entry.users === 0) {
      document.removeEventListener("visibilitychange", entry.store.wake);
      window.removeEventListener("focus", entry.store.wake);
      window.removeEventListener("online", entry.store.wake);
      stores.delete(scope);
    }
  };
}
