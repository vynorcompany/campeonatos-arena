"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { markAllPublicPlayerNotificationsReadAction, markPublicPlayerNotificationReadAction } from "@/lib/actions/public-player-notifications";
import type { AthletePortalNotification } from "@/lib/services/public-player-notifications";
import { cx } from "@/lib/ui/classes";

const iconBySource = { PLAYER: "✦", ARENA: "▣", FINANCE: "R$" };
type Position = { left: number; top: number; width: number; maxHeight: number };

export function AthletePortalNotifications({ arenaSlug, notifications }: { arenaSlug: string; notifications: AthletePortalNotification[] }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [items, setItems] = useState(notifications);
  const [tab, setTab] = useState<"new" | "read">("new");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => setItems(notifications), [notifications]);
  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(370, window.innerWidth - 24);
      const spaceBelow = window.innerHeight - rect.bottom - 20;
      setPosition({
        left: Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12)),
        top: spaceBelow < 200 ? 12 : rect.bottom + 8,
        width,
        maxHeight: spaceBelow < 200 ? Math.max(80, window.innerHeight - 24) : spaceBelow,
      });
    };
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
    };
    place();
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const acknowledge = (item: AthletePortalNotification) => {
    if (item.persistent) return;
    setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, isRead: true } : entry));
    startTransition(async () => { await markPublicPlayerNotificationReadAction(arenaSlug, item.id, item.source); router.refresh(); });
  };
  const unread = items.filter((item) => !item.isRead);
  const visible = items.filter((item) => tab === "new" ? !item.isRead : item.isRead);
  const persistent = unread.some((item) => item.persistent);
  const markAllRead = () => {
    if (!unread.length) return;
    setItems((current) => current.map((item) => item.persistent ? item : { ...item, isRead: true }));
    setTab("read");
    startTransition(async () => { await markAllPublicPlayerNotificationsReadAction(arenaSlug, unread.map(({ id, source }) => ({ id, source }))); router.refresh(); });
  };

  return <>
    <button ref={triggerRef} type="button" className="tw:relative tw:grid tw:size-10 tw:shrink-0 tw:place-items-center tw:rounded-xl tw:border tw:border-[#d8e5e9] tw:bg-white tw:text-[#133047] tw:dark:border-[#2a6155] tw:dark:bg-[#0b302a] tw:dark:text-[#eafff3]" aria-label="Notificações" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((current) => !current)}>
      <svg className="tw:size-5 tw:fill-none tw:stroke-current tw:stroke-[1.7]" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
      {unread.length ? <b className={cx("tw:absolute tw:-top-1 tw:-right-1 tw:grid tw:min-w-4 tw:place-items-center tw:rounded-full tw:bg-[#b42318] tw:px-1 tw:text-[.6rem] tw:leading-4 tw:text-white", persistent ? "tw:animate-pulse" : "")}>{persistent ? "!" : unread.length > 9 ? "9+" : unread.length}</b> : null}
    </button>
    {open && position ? createPortal(<section ref={panelRef} role="dialog" aria-label="Notificações" className="tw:fixed tw:z-[9999] tw:flex tw:flex-col tw:overflow-hidden tw:rounded-2xl tw:border tw:border-[#d8e5e9] tw:bg-white tw:text-[#133047] tw:shadow-[0_18px_48px_rgba(0,22,38,.24)] tw:dark:border-[#2a6155] tw:dark:bg-[#0b302a] tw:dark:text-[#eafff3]" style={position}>
      <header className="tw:flex tw:items-start tw:justify-between tw:gap-3 tw:border-b tw:border-[#d8e5e9] tw:p-4 tw:dark:border-[#2a6155]"><div><strong className="tw:block tw:text-sm">Notificações</strong><span className="tw:mt-1 tw:block tw:text-xs tw:text-[#607e8d] tw:dark:text-[#a4c8b9]">{pending ? "Atualizando..." : persistent ? "Há uma pendência para regularizar" : unread.length ? "Tudo que precisa da sua atenção" : "Você está em dia"}</span></div><button type="button" className="tw:grid tw:size-7 tw:shrink-0 tw:place-items-center tw:rounded-lg tw:border-0! tw:bg-[#edf3f4]! tw:text-lg tw:text-[#133047]! tw:dark:bg-[#2a6155]! tw:dark:text-[#eafff3]!" aria-label="Fechar notificações" onClick={() => setOpen(false)}>×</button></header>
      <nav className="tw:flex tw:items-center tw:gap-2 tw:border-b tw:border-[#d8e5e9] tw:px-3 tw:dark:border-[#2a6155]" aria-label="Filtro de notificações"><button type="button" className={cx("tw:min-h-10 tw:border-0! tw:border-b-2! tw:bg-transparent! tw:px-2 tw:text-xs", tab === "new" ? "tw:border-b-[#078f7c]! tw:font-semibold tw:text-[#078f7c]! tw:dark:border-b-[#5bdec1]! tw:dark:text-[#5bdec1]!" : "tw:border-b-transparent! tw:text-[#607e8d]! tw:dark:text-[#a4c8b9]!")} onClick={() => setTab("new")}>Novas {unread.length ? `(${unread.length})` : ""}</button><button type="button" className={cx("tw:min-h-10 tw:border-0! tw:border-b-2! tw:bg-transparent! tw:px-2 tw:text-xs", tab === "read" ? "tw:border-b-[#078f7c]! tw:font-semibold tw:text-[#078f7c]! tw:dark:border-b-[#5bdec1]! tw:dark:text-[#5bdec1]!" : "tw:border-b-transparent! tw:text-[#607e8d]! tw:dark:text-[#a4c8b9]!")} onClick={() => setTab("read")}>Lidas</button>{unread.length ? <button type="button" className="tw:ml-auto tw:border-0! tw:bg-transparent! tw:text-xs tw:font-medium tw:text-[#078f7c]! tw:dark:text-[#5bdec1]!" onClick={markAllRead} disabled={pending}>Ler tudo</button> : null}</nav>
      <div className="tw:min-h-0 tw:overflow-y-auto">{visible.length ? visible.map((item) => <Link href={item.href} key={item.id} className="tw:flex tw:items-start tw:gap-3 tw:border-b tw:border-[#e5edef] tw:p-3 tw:text-[#133047] tw:no-underline tw:last:border-0 tw:hover:bg-[#f5f8f8] tw:dark:border-[#2a6155] tw:dark:text-[#eafff3] tw:dark:hover:bg-[#183b50]" onClick={() => { if (!item.isRead) acknowledge(item); setOpen(false); }}><i className={cx("tw:grid tw:size-8 tw:shrink-0 tw:place-items-center tw:rounded-full tw:bg-[#def2ed] tw:text-xs tw:font-semibold tw:not-italic tw:text-[#078f7c] tw:dark:bg-[#144c4e] tw:dark:text-[#5bdec1]", item.persistent ? "tw:bg-[#fff0ed] tw:text-[#b42318] tw:dark:bg-[#4a2927] tw:dark:text-[#ff9e8f]" : "")} aria-hidden="true">{iconBySource[item.source]}</i><span className="tw:min-w-0 tw:flex-1"><strong className="tw:block tw:text-xs">{item.title}</strong><small className="tw:mt-1 tw:block tw:text-xs tw:leading-snug tw:text-[#607e8d] tw:dark:text-[#a4c8b9]">{item.message}</small></span><em className="tw:shrink-0 tw:text-[.65rem] tw:font-semibold tw:not-italic tw:text-[#078f7c] tw:dark:text-[#5bdec1]">{item.persistent ? "Quitar" : "Ver"}</em></Link>) : <p className="tw:p-5 tw:text-center tw:text-xs tw:text-[#607e8d] tw:dark:text-[#a4c8b9]">{tab === "new" ? "Nenhuma novidade por enquanto." : "Ainda não há notificações lidas."}</p>}</div>
    </section>, document.body) : null}
  </>;
}
