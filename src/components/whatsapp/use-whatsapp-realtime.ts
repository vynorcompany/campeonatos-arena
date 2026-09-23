"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Reconciles server-rendered conversations only while the inbox is visible. */
export function useWhatsAppRealtime({ paused = false }: { paused?: boolean }) {
  const router = useRouter();
  const version = useRef("");
  const lastReconcile = useRef(0);

  useEffect(() => {
    let disposed = false;
    const refresh = async () => {
      if (disposed || paused || document.visibilityState !== "visible") return;
      const response = await fetch(`/api/whatsapp/pulse?t=${Date.now()}`, { cache: "no-store", headers: { "cache-control": "no-cache" } }).catch(() => null);
      const payload = response?.ok ? await response.json().catch(() => null) as { version?: string } | null : null;
      if (!payload?.version || disposed) return;
      const changed = Boolean(version.current && version.current !== payload.version);
      version.current = payload.version;
      if (changed || Date.now() - lastReconcile.current >= 12_000) {
        lastReconcile.current = Date.now();
        router.refresh();
      }
    };

    void refresh();
    const timer = window.setInterval(() => void refresh(), 2_000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [paused, router]);
}
