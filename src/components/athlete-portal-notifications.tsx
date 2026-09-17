"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAllPublicPlayerNotificationsReadAction, markPublicPlayerNotificationReadAction } from "@/lib/actions/public-player-notifications";
import type { AthletePortalNotification } from "@/lib/services/public-player-notifications";
import styles from "./athlete-portal-notifications.module.css";

const iconBySource = { PLAYER: "✦", ARENA: "▣", FINANCE: "R$" };

export function AthletePortalNotifications({ arenaSlug, notifications }: { arenaSlug: string; notifications: AthletePortalNotification[] }) {
  const hasPersistentAttention = notifications.some((notification) => notification.persistent);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(notifications);
  const [tab, setTab] = useState<"new" | "read">("new");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setItems(notifications), [notifications]);
  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  const acknowledge = (item: AthletePortalNotification) => {
    if (item.persistent) return;
    setItems((current) => current.map((notification) => notification.id === item.id ? { ...notification, isRead: true } : notification));
    startTransition(async () => { await markPublicPlayerNotificationReadAction(arenaSlug, item.id, item.source); router.refresh(); });
  };
  const unread = items.filter((item) => !item.isRead);
  const visible = items.filter((item) => tab === "new" ? !item.isRead : item.isRead);
  const markAllRead = () => {
    if (!unread.length) return;
    setItems((current) => current.map((item) => item.persistent ? item : { ...item, isRead: true }));
    setTab("read");
    startTransition(async () => { await markAllPublicPlayerNotificationsReadAction(arenaSlug, unread.map(({ id, source }) => ({ id, source }))); router.refresh(); });
  };

  return <div ref={containerRef} className={styles.container}>
    <button type="button" className={styles.trigger} aria-label="Notificações" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
      {unread.length ? <b className={hasPersistentAttention ? styles.attention : ""}>{hasPersistentAttention ? "!" : unread.length > 9 ? "9+" : unread.length}</b> : null}
    </button>
    {open ? <section className={styles.modal} role="dialog" aria-label="Notificações">
      <header><div><strong>Notificações</strong><span>{pending ? "Atualizando..." : hasPersistentAttention ? "Há uma pendência em atraso para regularizar" : unread.length ? "Tudo que precisa da sua atenção" : "Você está em dia"}</span></div><button type="button" aria-label="Fechar notificações" onClick={() => setOpen(false)}>×</button></header>
      <nav className={styles.tabs} aria-label="Filtro de notificações"><button type="button" className={tab === "new" ? styles.active : ""} onClick={() => setTab("new")}>Novas{unread.length ? <b>{unread.length}</b> : null}</button><button type="button" className={tab === "read" ? styles.active : ""} onClick={() => setTab("read")}>Lidas</button>{unread.length ? <button type="button" className={styles.readAll} onClick={markAllRead} disabled={pending}>Ler tudo</button> : null}</nav>
      {visible.length ? <div>{visible.map((item) => <Link href={item.href} key={item.id} onClick={() => { if (!item.isRead) acknowledge(item); setOpen(false); }}><i className={`${item.source === "FINANCE" ? styles.finance : item.source === "ARENA" ? styles.arena : ""}${item.persistent ? ` ${styles.overdue}` : ""}`} aria-hidden="true">{iconBySource[item.source]}</i><span><strong>{item.title}</strong><small>{item.message}</small></span><em>{item.persistent ? "Quitar" : "Ver"}</em></Link>)}</div> : <p>{tab === "new" ? "Nenhuma novidade por enquanto." : "Ainda não há notificações lidas."}</p>}
    </section> : null}
  </div>;
}
