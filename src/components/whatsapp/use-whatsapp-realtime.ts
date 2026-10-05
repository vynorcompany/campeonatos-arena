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
      if (version.current !== pulse.version) { version.current = pulse.version; router.refresh(); }
    }, 3_000);
  }, [paused, router, scope]);
}
