"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { sharedUtilities } from "@/components/ui/shared.utilities";
import { releaseRevision } from "@/lib/release-version";

export function SystemUpdateNotice({ initialRevision }: { initialRevision: string | null }) {
  const baseline = useRef(releaseRevision(initialRevision));
  const offered = useRef<string | null>(null);
  const [available, setAvailable] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [snoozedUntil, setSnoozedUntil] = useState(0);
  const dismiss = useCallback(() => { setOpen(false); setSnoozedUntil(Date.now() + 10 * 60_000); }, []);

  useEffect(() => {
    let stopped = false, failures = 0, lastCheck = 0;
    let timer: ReturnType<typeof setTimeout>;
    let request: AbortController | undefined;
    const schedule = (delay: number) => { clearTimeout(timer); if (!stopped) timer = setTimeout(check, delay); };
    async function check() {
      if (stopped) return;
      if (document.visibilityState !== "visible" || !navigator.onLine) { schedule(60_000); return; }
      if (request || Date.now() - lastCheck < 5_000) { schedule(5_000); return; }
      lastCheck = Date.now();
      request = new AbortController();
      const timeout = setTimeout(() => request?.abort(), 8_000);
      try {
        const response = await fetch("/api/version", { cache: "no-store", signal: request.signal });
        if (!response.ok) throw new Error("Version unavailable");
        const revision = releaseRevision((await response.json())?.revision);
        if (!revision) throw new Error("Invalid release");
        if (!stopped) {
          failures = 0;
          if (!baseline.current) baseline.current = revision;
          else if (revision !== baseline.current) {
            if (offered.current !== revision) { offered.current = revision; setSnoozedUntil(0); }
            setAvailable(revision);
          } else { setAvailable(null); setOpen(false); }
        }
      } catch { failures = Math.min(failures + 1, 4); }
      finally { clearTimeout(timeout); request = undefined; schedule(Math.min(300_000, 60_000 * 2 ** failures)); }
    }
    const resume = () => { if (document.visibilityState === "visible" && navigator.onLine) { clearTimeout(timer); void check(); } };
    schedule(15_000);
    window.addEventListener("focus", resume);
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", resume);
    return () => { stopped = true; clearTimeout(timer); request?.abort(); window.removeEventListener("focus", resume); window.removeEventListener("online", resume); document.removeEventListener("visibilitychange", resume); };
  }, []);

  useEffect(() => {
    if (!available) return;
    let timer: ReturnType<typeof setTimeout>;
    const offer = () => {
      const remaining = snoozedUntil - Date.now();
      // Let the user finish the current modal before offering a page refresh.
      if (remaining > 0) timer = setTimeout(offer, remaining);
      else if (document.visibilityState !== "visible" || document.querySelector('[role="dialog"][aria-modal="true"]')) timer = setTimeout(offer, 2_000);
      else setOpen(true);
    };
    offer();
    return () => clearTimeout(timer);
  }, [available, snoozedUntil]);

  return <Modal open={open} title="Atualização disponível" onClose={dismiss} fixedSize={false} width="tw:max-w-[400px]">
    <div className="tw:grid tw:min-w-0 tw:gap-4">
      <p className="tw:m-0 tw:text-sm tw:leading-relaxed tw:text-[var(--muted)]">Há uma nova versão do sistema. Salve o que estiver editando antes de atualizar.</p>
      <footer className="tw:flex tw:flex-wrap tw:justify-end tw:gap-2">
        <button type="button" className={sharedUtilities.buttonButtonSmall} onClick={dismiss}>Mais tarde</button>
        <button type="button" className={sharedUtilities.buttonButtonPrimaryButtonSmall} onClick={() => window.location.reload()}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="tw:size-4" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 7a7 7 0 0 1 11.6-1L20 9M4 15l2.3 3A7 7 0 0 0 18 17"/></svg>Atualizar</button>
      </footer>
    </div>
  </Modal>;
}
