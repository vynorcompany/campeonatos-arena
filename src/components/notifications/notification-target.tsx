"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Locate an anchor even when its section or feed arrives after navigation. */
export function NotificationTarget() {
  const pathname = usePathname();
  const query = useSearchParams()?.toString() ?? "";
  useEffect(() => {
    let observer: MutationObserver | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let queued: ReturnType<typeof setTimeout> | undefined;
    let clearHighlight: (() => void) | undefined;
    let highlighted = "";
    const stopWaiting = () => { observer?.disconnect(); observer = undefined; if (timeout) clearTimeout(timeout); };
    const locate = () => {
      let id: string;
      try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return false; }
      if (!id || id.length > 500) return false;
      const target = document.getElementById(id);
      if (!target || !target.getClientRects().length) return false;
      const key = `${window.location.pathname}${window.location.search}#${id}`;
      if (highlighted === key) return true;
      clearHighlight?.();
      highlighted = key;
      target.scrollIntoView({ block: "center", behavior: "instant" });
      const previousTabIndex = target.getAttribute("tabindex");
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      const classes = ["tw:motion-safe:animate-[notification-target-flash_1s_ease-in-out_3]", "tw:motion-reduce:outline-2", "tw:motion-reduce:outline-blue-500"];
      const added = classes.filter(value => !target.classList.contains(value));
      target.classList.add(...added);
      target.dataset.notificationTarget = "true";
      const remove = () => {
        target.classList.remove(...added);
        delete target.dataset.notificationTarget;
        if (previousTabIndex === null) target.removeAttribute("tabindex"); else target.setAttribute("tabindex", previousTabIndex);
      };
      const timer = setTimeout(remove, 3500);
      clearHighlight = () => { clearTimeout(timer); remove(); };
      return true;
    };
    const start = () => {
      stopWaiting();
      if (!window.location.hash || locate()) return;
      observer = new MutationObserver(() => { if (locate()) stopWaiting(); });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "class", "style"] });
      timeout = setTimeout(stopWaiting, 30_000);
    };
    const click = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!anchor || event.button || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const url = new URL(anchor.getAttribute("href") ?? "", window.location.href);
      if (url.origin !== window.location.origin || !url.hash) return;
      highlighted = "";
      if (queued) clearTimeout(queued);
      queued = setTimeout(start, 150);
    };
    start();
    window.addEventListener("hashchange", start);
    window.addEventListener("popstate", start);
    document.addEventListener("click", click);
    return () => { stopWaiting(); clearHighlight?.(); if (queued) clearTimeout(queued); window.removeEventListener("hashchange", start); window.removeEventListener("popstate", start); document.removeEventListener("click", click); };
  }, [pathname, query]);
  return null;
}
