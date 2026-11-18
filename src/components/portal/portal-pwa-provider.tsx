"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { isPortalPwaPath } from "@/lib/portal/pwa-policy";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type PwaContext = {
  online: boolean;
  installed: boolean;
  platform: "ios" | "android" | "browser";
  canInstall: boolean;
  installing: boolean;
  error: string | null;
  install: () => Promise<void>;
};
const Context = createContext<PwaContext | null>(null);
export const usePortalPwa = () => useContext(Context);

export function PortalPwaProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const pathname = usePathname();
  const active = enabled && isPortalPwaPath(pathname ?? "");
  const [online, setOnline] = useState(true);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<PwaContext["platform"]>("browser");
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (enabled || !("serviceWorker" in navigator)) return;
    let stopped = false;
    void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
      for (const registration of registrations) {
        if (stopped) return;
        const workers = [registration.active, registration.waiting, registration.installing].filter((worker): worker is ServiceWorker => Boolean(worker));
        const onlyPortalWorkers = workers.length > 0 && workers.every((worker) => {
          const script = new URL(worker.scriptURL);
          return script.origin === location.origin && script.pathname === "/portal/sw.js";
        });
        if (onlyPortalWorkers) await registration.unregister();
      }
    }).catch(() => {
      // Disabled mode remains invisible even if the browser cannot inspect registrations.
    });
    return () => { stopped = true; };
  }, [enabled]);

  useEffect(() => {
    if (!active) return;
    const standalone = window.matchMedia("(display-mode: standalone)");
    const readInstalled = () => setInstalled(standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const readOnline = () => setOnline(navigator.onLine);
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const didInstall = () => {
      setInstalled(true);
      setPrompt(null);
    };
    readInstalled();
    readOnline();
    setPlatform(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ? "ios" : /Android/i.test(navigator.userAgent) ? "android" : "browser");
    standalone.addEventListener("change", readInstalled);
    window.addEventListener("online", readOnline);
    window.addEventListener("offline", readOnline);
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", didInstall);
    let mounted = true;
    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register("/portal/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
        if (mounted) setError("Não foi possível preparar a instalação. Atualize a página e tente novamente.");
      });
    }
    return () => {
      mounted = false;
      standalone.removeEventListener("change", readInstalled);
      window.removeEventListener("online", readOnline);
      window.removeEventListener("offline", readOnline);
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", didInstall);
    };
  }, [active]);

  async function install() {
    if (!prompt || installing || installed) return;
    setInstalling(true);
    setError(null);
    try {
      await prompt.prompt();
      await prompt.userChoice;
      setPrompt(null);
    } catch {
      setError("Não foi possível abrir a instalação. Tente novamente pelo menu do navegador.");
      setPrompt(null);
    } finally {
      setInstalling(false);
    }
  }
  return <Context.Provider value={active ? { online, installed, platform, canInstall: Boolean(prompt), installing, error, install } : null}>{children}</Context.Provider>;
}
