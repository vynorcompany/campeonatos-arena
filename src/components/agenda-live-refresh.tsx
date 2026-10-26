"use client";
import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AgendaLiveRefresh({ date, version }: { date: string; version: string }) {
  const router = useRouter(); const current = useRef(version); const [pending, startTransition] = useTransition();
  useEffect(() => { current.current = version; }, [version]);
  useEffect(() => {
    let active = true; let checking = false; let timer: ReturnType<typeof setTimeout>; const controller = new AbortController();
    const check = async () => {
      if (checking) return;
      checking = true;
      try {
        if (document.visibilityState === "visible" && !Array.from(document.querySelectorAll('[role="dialog"]')).some(dialog => dialog.getClientRects().length > 0) && !pending) {
          const response = await fetch(`/api/agenda/version?date=${encodeURIComponent(date)}`, { cache: "no-store", signal: controller.signal });
          if (response.ok) { const result = await response.json(); if (active && typeof result.version === "string" && result.version !== current.current) startTransition(() => router.refresh()); }
        }
      } catch { /* A transient network failure is retried on the next tick. */ }
      finally { checking = false; clearTimeout(timer); if (active) timer = setTimeout(check, 5000); }
    };
    timer = setTimeout(check, 5000);
    const focus = () => { clearTimeout(timer); void check(); };
    window.addEventListener("focus", focus);
    return () => { active = false; controller.abort(); clearTimeout(timer); window.removeEventListener("focus", focus); };
  }, [date, router, pending]);
  return null;
}
