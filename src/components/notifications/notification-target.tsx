"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/** Follow notification targets after navigation, including lists loaded asynchronously. */
export function NotificationTarget() {
  const pathname = usePathname();
  const query = useSearchParams()?.toString() ?? "";
  useEffect(() => {
    let observer: MutationObserver | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let queued: ReturnType<typeof setTimeout> | undefined;
    let scrolled = false;
    const cleanups = new Map<HTMLElement, () => void>();
    const stopWaiting = () => { observer?.disconnect(); observer = undefined; if (timeout) clearTimeout(timeout); };
    const locate = () => {
      const url = new URL(window.location.href);
      let id = "";
      try { id = decodeURIComponent(url.hash.slice(1)); } catch { return; }
      if (id.length > 500) return;
      const anchor = id ? document.getElementById(id) : null;
      const ids = new Set([...(url.searchParams.get("ids") ?? "").split(","), ...["player", "entry", "entryId", "occurrence", "occurrenceId"].map(key=>url.searchParams.get(key) ?? "")].filter(Boolean));
      const items = url.searchParams.has("notification") ? Array.from(document.querySelectorAll<HTMLElement>("[data-notification-item]")).filter(item=>(!id && !ids.size) || ids.has(item.dataset.notificationItem ?? "")) : [];
      const nested = anchor ? Array.from(anchor.querySelectorAll<HTMLElement>("[data-notification-item]")) : [];
      const targets = anchor ? [...(nested.length ? nested : [anchor]), ...items.filter(item=>!anchor.contains(item))] : items;
      for(const target of targets) {
        if(cleanups.has(target) || !target.getClientRects().length) continue;
        if(!scrolled) { target.scrollIntoView({block:"center",behavior:"instant"}); scrolled=true; }
        const previousTabIndex = target.getAttribute("tabindex");
        target.setAttribute("tabindex", "-1");
        if(target===targets[0])target.focus({preventScroll:true});
        const classes = ["tw:outline-none","tw:motion-safe:animate-[notification-target-flash_1s_ease-in-out_3]", "tw:motion-reduce:outline-2", "tw:motion-reduce:outline-blue-500"];
        const added = classes.filter(value => !target.classList.contains(value));
        target.classList.add(...added);
        target.dataset.notificationTarget = "true";
        const remove=()=>{ target.classList.remove(...added); delete target.dataset.notificationTarget; if(previousTabIndex===null)target.removeAttribute("tabindex");else target.setAttribute("tabindex",previousTabIndex); };
        const timer=setTimeout(remove,3500);
        cleanups.set(target,()=>{clearTimeout(timer);remove();});
      }
    };
    const start = () => {
      stopWaiting(); for(const cleanup of cleanups.values())cleanup();cleanups.clear();scrolled=false;
      if (!window.location.hash && !new URL(window.location.href).searchParams.has("notification")) return;
      locate();
      observer = new MutationObserver(locate);
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "class", "style"] });
      timeout = setTimeout(stopWaiting, 30_000);
    };
    const click = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!anchor || event.button || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const url = new URL(anchor.getAttribute("href") ?? "", window.location.href);
      if (url.origin !== window.location.origin || (!url.hash && !url.searchParams.has("notification"))) return;
      if (queued) clearTimeout(queued);
      queued = setTimeout(start, 150);
    };
    start();
    window.addEventListener("hashchange", start);
    window.addEventListener("popstate", start);
    document.addEventListener("click", click);
    return () => { stopWaiting(); for(const cleanup of cleanups.values())cleanup(); if (queued) clearTimeout(queued); window.removeEventListener("hashchange", start); window.removeEventListener("popstate", start); document.removeEventListener("click", click); };
  }, [pathname, query]);
  return null;
}
