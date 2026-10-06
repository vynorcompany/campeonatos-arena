"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { viewStyles } from "./app-shell.utilities";

export function MobileAppFrame({ arenaName, sidebar, children }: { arenaName: string; sidebar: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => { setMenuOpen(false); }, [pathname]);
  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    const desktop = window.matchMedia("(min-width: 761px)");
    const onResize = () => { if (desktop.matches) setMenuOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onResize);
    };
  }, [menuOpen]);

  return <div className={`${viewStyles.app_shell}${menuOpen ? " mobile-nav-open" : ""}`} onClickCapture={(event) => {
    if (menuOpen && event.target instanceof Element && event.target.closest("#arena-mobile-navigation a[href]")) setMenuOpen(false);
  }}>
    <header className="tw:sticky tw:top-0 tw:z-[30] tw:hidden tw:min-h-14 tw:items-center tw:gap-3 tw:border-b tw:border-solid tw:border-[#dce7f2] tw:bg-white tw:px-4 tw:viewport-760:flex">
      <button ref={menuButton} type="button" aria-label="Abrir menu" aria-expanded={menuOpen} aria-controls="arena-mobile-navigation" onClick={() => setMenuOpen(true)} className="tw:grid tw:size-10 tw:shrink-0 tw:place-items-center tw:rounded-lg tw:border tw:border-solid tw:border-[#d4e2ef] tw:bg-[#f5f9fd] tw:text-[#173b66] tw:focus-visible:outline-2 tw:focus-visible:outline-[#1765bc]">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
      <div className="tw:min-w-0 tw:leading-tight"><strong className="tw:block tw:truncate tw:text-sm tw:text-[#102d52]">{arenaName}</strong><span className="tw:text-[.68rem] tw:text-[#667b91]">Arena Padel Manager</span></div>
    </header>
    {menuOpen ? <button type="button" aria-label="Fechar menu" className="tw:fixed tw:inset-0 tw:z-[40] tw:hidden tw:bg-[#07182e]/65 tw:viewport-760:block" onClick={() => { setMenuOpen(false); menuButton.current?.focus(); }} /> : null}
    {menuOpen ? <button type="button" aria-label="Fechar menu lateral" className="tw:fixed tw:right-3 tw:top-3 tw:z-[60] tw:hidden tw:size-10 tw:place-items-center tw:rounded-full tw:bg-white tw:text-[#173b66] tw:shadow-lg tw:viewport-760:grid" onClick={() => { setMenuOpen(false); menuButton.current?.focus(); }}><svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" /></svg></button> : null}
    {sidebar}
    {children}
  </div>;
}
