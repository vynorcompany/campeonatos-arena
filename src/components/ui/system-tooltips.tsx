"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

type Tooltip = { element: HTMLElement; text: string };
type Position = { left: number; top: number; maxWidth: number; maxHeight: number };

/** One tooltip layer for native DOM titles and the system's explicit tooltip hints. */
export function SystemTooltips() {
  const id = useId();
  const tipRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [position, setPosition] = useState<Position | null>(null);

  useEffect(() => {
    let active: HTMLElement | null = null;
    let hovered = false;
    let focused = false;
    let overTip = false;
    let touch = false;
    let dismissed: HTMLElement | null = null;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const titles = new Map<HTMLElement, string>();
    let generatedLabel: string | null = null;
    let labelOwner: HTMLElement | null = null;

    const clearTimer = () => { if (hideTimer) clearTimeout(hideTimer); hideTimer = undefined; };
    const restoreTitles = () => {
      for (const [element, title] of titles) if (!element.hasAttribute("title")) element.setAttribute("title", title);
      titles.clear();
      if (generatedLabel !== null && labelOwner?.getAttribute("aria-label") === generatedLabel) labelOwner.removeAttribute("aria-label");
      generatedLabel = null;
      labelOwner = null;
    };
    const hide = (keepNativeSuppressed = false) => {
      clearTimer();
      if (active) {
        const descriptions = (active.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(value => value && value !== id);
        if (descriptions.length) active.setAttribute("aria-describedby", descriptions.join(" "));
        else active.removeAttribute("aria-describedby");
      }
      if (!keepNativeSuppressed) restoreTitles();
      active = null;
      hovered = focused = overTip = false;
      setTooltip(null);
      setPosition(null);
    };
    const suppressNativeTitles = (element: HTMLElement) => {
      for (let node: HTMLElement | null = element; node; node = node.parentElement) {
        const title = node.getAttribute("title");
        if (title !== null) { titles.set(node, title); node.removeAttribute("title"); }
      }
    };
    const textFor = (element: HTMLElement) => element.getAttribute("data-tooltip") ?? element.getAttribute("title") ?? titles.get(element) ?? "";
    const update = () => {
      if (!active) return;
      const text = textFor(active).trim();
      if (!text || !active.isConnected) { hide(); return; }
      // The native title may be the only accessible name of an icon button.
      const currentLabel = active.getAttribute("aria-label");
      if (generatedLabel !== null && currentLabel === generatedLabel) {
        active.setAttribute("aria-label", text);
        generatedLabel = text;
      } else if (!currentLabel && !active.hasAttribute("aria-labelledby") && !active.textContent?.trim()) {
        active.setAttribute("aria-label", text);
        generatedLabel = text;
        labelOwner = active;
      }
      suppressNativeTitles(active);
      const descriptions = new Set((active.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean));
      descriptions.add(id);
      active.setAttribute("aria-describedby", [...descriptions].join(" "));
      setTooltip(previous => previous?.element === active && previous.text === text ? previous : { element: active!, text });
    };
    const source = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return null;
      if (active?.contains(target)) return active;
      const element = target.closest("[title], [data-tooltip]");
      return element instanceof HTMLElement && textFor(element).trim() ? element : null;
    };
    const show = (element: HTMLElement, mode: "hover" | "focus") => {
      if (dismissed === element) return;
      clearTimer();
      if (active !== element) { hide(); active = element; }
      if (mode === "hover") hovered = true;
      else focused = true;
      update();
    };
    const scheduleHide = () => { clearTimer(); hideTimer = setTimeout(() => { if (!hovered && !focused && !overTip) hide(); }, 160); };
    const pointerOver = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      if (tipRef.current?.contains(event.target as Node)) { overTip = true; clearTimer(); return; }
      const element = source(event.target);
      if (element) show(element, "hover");
    };
    const pointerOut = (event: PointerEvent) => {
      const next = event.relatedTarget;
      if (tipRef.current?.contains(event.target as Node)) {
        if (next instanceof Node && tipRef.current.contains(next)) return;
        overTip = false;
        scheduleHide();
      }
      if (active?.contains(event.target as Node)) {
        if (next instanceof Node && active.contains(next)) return;
        hovered = false;
        dismissed = null;
        scheduleHide();
      } else if (dismissed?.contains(event.target as Node) && !(next instanceof Node && dismissed.contains(next)) && !dismissed.contains(document.activeElement)) { dismissed = null; restoreTitles(); }
    };
    const focusIn = (event: FocusEvent) => { const element = source(event.target); if (element && !touch) show(element, "focus"); };
    const focusOut = (event: FocusEvent) => {
      if (active?.contains(event.target as Node)) { focused = false; scheduleHide(); }
      if (dismissed?.contains(event.target as Node)) { dismissed = null; restoreTitles(); }
    };
    const pointerDown = (event: PointerEvent) => { touch = event.pointerType === "touch"; dismissed = active ?? dismissed; hide(true); };
    const keyDown = (event: KeyboardEvent) => {
      touch = false;
      if (event.key === "Escape") { dismissed = active ?? dismissed; hide(true); }
    };
    const scroll = (event: Event) => { if (!tipRef.current?.contains(event.target as Node)) { dismissed = active ?? dismissed; hide(true); } };
    const observer = new MutationObserver(records => {
      if (!active) return;
      if (!active.isConnected) { hide(); return; }
      if (records.some(record => record.type === "attributes" && (record.target === active || (record.attributeName === "title" && (record.target as Element).contains(active))))) update();
    });
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["title", "data-tooltip"] });
    document.addEventListener("pointerover", pointerOver);
    document.addEventListener("pointerout", pointerOut);
    document.addEventListener("pointerdown", pointerDown, true);
    document.addEventListener("focusin", focusIn);
    document.addEventListener("focusout", focusOut);
    document.addEventListener("keydown", keyDown);
    document.addEventListener("scroll", scroll, true);
    const resize = () => hide();
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      document.removeEventListener("pointerover", pointerOver);
      document.removeEventListener("pointerout", pointerOut);
      document.removeEventListener("pointerdown", pointerDown, true);
      document.removeEventListener("focusin", focusIn);
      document.removeEventListener("focusout", focusOut);
      document.removeEventListener("keydown", keyDown);
      document.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", resize);
      hide();
    };
  }, [id]);

  useLayoutEffect(() => {
    if (!tooltip || !tipRef.current) return;
    const margin = 8;
    const maxWidth = Math.max(1, Math.min(320, window.innerWidth - margin * 2));
    const maxHeight = Math.max(1, window.innerHeight - margin * 2);
    const rect = tooltip.element.getBoundingClientRect();
    const tip = tipRef.current.getBoundingClientRect();
    const width = Math.min(tip.width, maxWidth);
    const height = Math.min(tip.height, maxHeight);
    const below = rect.bottom + margin;
    const top = below + height <= window.innerHeight - margin ? below : Math.max(margin, rect.top - height - margin);
    setPosition({ left: Math.max(margin, Math.min(rect.left + (rect.width - width) / 2, window.innerWidth - width - margin)), top, maxWidth, maxHeight });
  }, [tooltip]);

  if (!tooltip) return null;
  return <div ref={tipRef} id={id} role="tooltip" className="tw:fixed tw:z-[2147483647] tw:w-max tw:max-w-[min(320px,calc(100vw-16px))] tw:overflow-y-auto tw:rounded-md tw:bg-[#174983] tw:px-3 tw:py-2 tw:text-left tw:text-xs tw:leading-relaxed tw:font-normal tw:break-words tw:whitespace-pre-line tw:text-white tw:shadow-[0_4px_12px_rgba(16,45,81,.18)] tw:[overflow-wrap:anywhere]" style={position ?? { left: 0, top: 0, visibility: "hidden" }}>{tooltip.text}</div>;
}
