"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Reconciles server-rendered conversations only while the inbox is visible. */
export function useWhatsAppRealtime({ paused = false, initialVersion }: { paused?: boolean; initialVersion: string }) {
  const router = useRouter();
  const version = useRef(initialVersion);

  useEffect(() => { version.current = initialVersion; }, [initialVersion]);

  useEffect(() => {
    let disposed = false;
    let checking = false;
    const refresh = async () => {
      if (disposed || checking || paused || document.visibilityState !== "visible") return;
      checking = true;
      try {
        const response = await fetch("/api/whatsapp/pulse", { cache: "no-store" }).catch(() => null);
        const payload = response?.ok ? await response.json().catch(() => null) as { version?: string } | null : null;
        if (!payload?.version || disposed) return;
        if (version.current !== payload.version) {
          version.current = payload.version;
          router.refresh();
        }
      } finally {
        checking = false;
      }
    };

    void refresh();
    const timer = window.setInterval(() => void refresh(), 2_000);
    return () => { disposed = true; window.clearInterval(timer); };
  }, [paused, router]);
}
