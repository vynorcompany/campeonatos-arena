"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { refreshArenaWhatsAppConnectionStatusAction } from "@/lib/actions/agency";

export function WhatsAppConnectionStatusWatcher({ arenaId }: { arenaId: string }) {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    let checking = false;
    const check = async () => {
      if (checking || !active || document.visibilityState !== "visible" || navigator.onLine === false) return;
      checking = true;
      try {
        const form = new FormData();
        form.set("arenaId", arenaId);
        const result = await refreshArenaWhatsAppConnectionStatusAction(form);
        if (active && result.connected) router.refresh();
      } catch {
        // A próxima consulta recupera falhas transitórias da Evolution.
      } finally {
        checking = false;
      }
    };
    void check();
    const interval = window.setInterval(() => void check(), 4000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("online", check);
    return () => { active = false; window.clearInterval(interval); document.removeEventListener("visibilitychange", check); window.removeEventListener("online", check); };
  }, [arenaId, router]);

  return null;
}
