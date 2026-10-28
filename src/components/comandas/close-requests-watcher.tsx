"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export function CloseRequestsWatcher({ revision }: { revision: string }) {
  const router = useRouter();
  useEffect(() => {
    const controller = new AbortController(); let checking = false;
    const check = async () => {
      if (checking || document.visibilityState !== "visible" || navigator.onLine === false) return;
      checking = true;
      try { const response = await fetch("/api/comandas/close-requests", { cache: "no-store", signal: controller.signal }); if (response.ok && (await response.json()).revision !== revision) router.refresh(); } catch { /* Keep current cards while offline. */ } finally { checking = false; }
    };
    const onRequest = () => router.refresh(); window.addEventListener("arena-comanda-request", onRequest);
    const timer = window.setInterval(check, 10_000); document.addEventListener("visibilitychange", check);
    return () => { window.removeEventListener("arena-comanda-request", onRequest); window.clearInterval(timer); document.removeEventListener("visibilitychange", check); controller.abort(); };
  }, [revision, router]);
  return null;
}
