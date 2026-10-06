"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
/** Mounted once per page rather than once per card. Hidden tabs do no work. */
export function VisiblePageRefresh({ interval = 15_000 }: { interval?: number }) {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible" && navigator.onLine !== false) router.refresh(); };
    const timer = window.setInterval(refresh, interval);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", refresh); window.removeEventListener("online", refresh); };
  }, [interval, router]);
  return null;
}
