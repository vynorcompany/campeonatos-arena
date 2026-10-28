"use client";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
type RequestNotice = { id: string; title: string; message: string; href: string; createdAt: string };
/** Staff alerts are scoped by the authenticated arena on the server. */
export function ComandaRequestAlerts({ showSettings = false, settingsHost }: { showSettings?: boolean; settingsHost?: HTMLElement | null }) {
  const [notice, setNotice] = useState<RequestNotice | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [feedback, setFeedback] = useState("");
  const sound = useRef<AudioContext | null>(null);
  const seen = useRef(new Set<string>());
  useEffect(() => {
    let active = true, checking = false;
    const startedAt = Date.now();
    setEnabled(localStorage.getItem("arena-comanda-alerts") === "on");
    const unlock = () => { if (localStorage.getItem("arena-comanda-alerts") === "on") { sound.current ??= new AudioContext(); void sound.current.resume().catch(() => {}); } };
    const check = async () => {
      if (checking || !navigator.onLine) return;
      checking = true;
      try {
        const response = await fetch("/api/comandas/notifications", { cache: "no-store" });
        if (!response.ok || !active) return;
        const data = await response.json() as { notifications: RequestNotice[] };
        const fresh = data.notifications.filter(item => !seen.current.has(item.id) && new Date(item.createdAt).getTime() >= startedAt);
        for (const item of data.notifications) seen.current.add(item.id);
        if (!fresh.length) return;
        const latest = fresh[0]; setNotice(latest);
        window.dispatchEvent(new Event("arena-comanda-request"));
        if (localStorage.getItem("arena-comanda-alerts") !== "on") return;
        const context = sound.current;
        if (context?.state === "running") {
          const oscillator = context.createOscillator(), gain = context.createGain(); oscillator.connect(gain); gain.connect(context.destination);
          oscillator.frequency.setValueAtTime(740, context.currentTime); oscillator.frequency.setValueAtTime(988, context.currentTime + .12);
          gain.gain.setValueAtTime(.12, context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .4);
          oscillator.start(); oscillator.stop(context.currentTime + .4);
        }
        if ("Notification" in window && Notification.permission === "granted") {
          const push = new Notification(latest.title, { body: latest.message, tag: latest.id });
          push.onclick = () => { window.focus(); window.location.assign(latest.href || "/comandas"); push.close(); };
        }
      } catch { /* Retain current notice; retry on the next interval. */ } finally { checking = false; }
    };
    void check(); const timer = window.setInterval(check, 15000);
    document.addEventListener("pointerdown", unlock); window.addEventListener("online", check);
    return () => { active = false; clearInterval(timer); document.removeEventListener("pointerdown", unlock); window.removeEventListener("online", check); void sound.current?.close(); sound.current = null; };
  }, []);
  async function enable() {
    sound.current ??= new AudioContext(); await sound.current.resume();
    localStorage.setItem("arena-comanda-alerts", "on"); setEnabled(true);
    if ("Notification" in window) { const permission = await Notification.requestPermission(); if (permission !== "granted") setFeedback("Som ativado. Libere notificações nas permissões do navegador para receber os alertas na área de trabalho."); }
  }
  const settings = <div className="tw:flex tw:flex-wrap tw:items-center tw:gap-2 tw:border-b tw:border-[var(--line)] tw:p-3">{showSettings ? <button type="button" aria-pressed={enabled} onClick={() => { if (enabled) { localStorage.removeItem("arena-comanda-alerts"); setEnabled(false); } else void enable().catch(() => setFeedback("Não foi possível ativar os alertas neste navegador.")); }} className="tw:rounded-md tw:border tw:border-[var(--line)] tw:bg-white tw:px-2 tw:py-1 tw:text-xs tw:font-medium tw:text-[#174a85]">{enabled ? "Alertas sonoros ativos" : "Ativar som e notificações"}</button> : null}{showSettings && feedback ? <p role="status" className="tw:text-xs tw:text-[#354f70]">{feedback}</p> : null}</div>;
  return <>{showSettings && settingsHost ? createPortal(settings, settingsHost) : null}{notice ? createPortal(<aside role="status" aria-live="polite" className="tw:fixed tw:right-4 tw:bottom-4 tw:z-[1200] tw:w-[min(380px,calc(100vw_-_32px))] tw:rounded-md tw:border tw:border-[#8bb5ed] tw:border-l-4 tw:bg-white tw:p-4 tw:text-[#153c70] tw:shadow-xl"><div className="tw:flex tw:items-start tw:justify-between tw:gap-3"><strong className="tw:text-sm">{notice.title}</strong><button type="button" aria-label="Dispensar alerta" onClick={() => setNotice(null)} className="tw:size-7 tw:shrink-0 tw:rounded tw:border tw:border-[#b8cfee]">×</button></div><p className="tw:my-2 tw:text-sm">{notice.message}</p><Link href={notice.href || "/comandas"} onClick={() => setNotice(null)} className="tw:text-sm tw:font-semibold tw:underline">Atender solicitação</Link></aside>, document.body) : null}</>;
}
