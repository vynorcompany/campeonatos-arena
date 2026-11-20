"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const interactiveTarget = "a,button,input,select,textarea,label,summary,form,[role=button],[role=combobox],[contenteditable=true]";

export function ExpandableGameCard({ children, className, label, expandable }: { children: ReactNode; className: string; label: string; expandable: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const details = cardRef.current?.querySelector<HTMLDetailsElement>("details[data-game-editor]");
    if (!details) return;
    const sync = () => setOpen(details.open);
    sync();
    details.addEventListener("toggle", sync);
    return () => details.removeEventListener("toggle", sync);
  }, []);

  function toggle() {
    const details = cardRef.current?.querySelector<HTMLDetailsElement>("details[data-game-editor]");
    if (details) {
      details.open = !details.open;
      setOpen(details.open);
    }
  }

  return <div ref={cardRef} className={`${className} ${expandable ? "tw:relative tw:cursor-pointer tw:focus-within:outline-2 tw:focus-within:outline-offset-2 tw:focus-within:outline-[#1e5ea8]" : ""}`} onClick={event => {
    if (!expandable || !(event.target instanceof Element) || event.target.closest(interactiveTarget) || event.target.closest("details") || window.getSelection()?.toString()) return;
    toggle();
  }}>
    {expandable ? <button type="button" className="tw:sr-only" aria-label={`${open ? "Minimizar" : "Expandir"} edição de ${label}`} aria-expanded={open} onClick={toggle} /> : null}
    {children}
  </div>;
}
