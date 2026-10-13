"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { subscribeWhatsAppPulse } from "./whatsapp-pulse";
export function useWhatsAppRealtime({ paused = false, initialVersion, scope = "" }: { paused?: boolean; initialVersion: string; scope?: string }) {
  const router = useRouter();
  const version = useRef(initialVersion);
  useEffect(() => { version.current = initialVersion; }, [initialVersion]);
  useEffect(() => {
    if (paused) return;
    return subscribeWhatsAppPulse(scope, pulse => {
      // Acknowledge only the version rendered by the server. A failed or stale
      // refresh must not suppress the next attempt to load new messages.
      if (version.current !== pulse.version) router.refresh();
    }, 3_000, true);
  }, [paused, router, scope]);
}
