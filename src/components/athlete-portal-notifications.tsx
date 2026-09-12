"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAllPublicPlayerNotificationsReadAction, markPublicPlayerNotificationReadAction } from "@/lib/actions/public-player-notifications";
import type { AthletePortalNotification } from "@/lib/services/public-player-notifications";

const iconBySource = { PLAYER: "✦", ARENA: "▣", FINANCE: "R$" };

export function AthletePortalNotifications({ arenaSlug, notifications }: { arenaSlug: string; notifications: AthletePortalNotification[] }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(notifications);
  const [tab, setTab] = useState<"new" | "read">("new");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  useEffect(() => setItems(notifications), [notifications]);
  const acknowledge = (item: AthletePortalNotification) => {
    setItems((current) => current.map((notification) => notification.id === item.id ? { ...notification, isRead: true } : notification));
    startTransition(async () => { await markPublicPlayerNotificationReadAction(arenaSlug, item.id, item.source); router.refresh(); });
  };
  const unread = items.filter((item) => !item.isRead);
  const visible = items.filter((item) => tab === "new" ? !item.isRead : item.isRead);
  const markAllRead = () => {
    if (!unread.length) return;
    setItems((current) => current.map((item) => ({ ...item, isRead: true })));
    setTab("read");
    startTransition(async () => { await markAllPublicPlayerNotificationsReadAction(arenaSlug, unread.map(({ id, source }) => ({ id, source }))); router.refresh(); });
  };
  return <div className="athlete-portal-notifications"><button type="button" className="athlete-portal-notification-trigger" aria-label="Notificações" aria-expanded={open} onClick={() => setOpen((current) => !current)}><span aria-hidden="true">🔔</span>{unread.length ? <b>{unread.length > 9 ? "9+" : unread.length}</b> : null}</button>{open ? <section className="athlete-portal-notification-modal" role="dialog" aria-label="Notificações"><header><div><strong>Notificações</strong><span>{pending ? "Atualizando..." : unread.length ? "Tudo que precisa da sua atenção" : "Você está em dia"}</span></div><button type="button" aria-label="Fechar notificações" onClick={() => setOpen(false)}>×</button></header><nav className="athlete-portal-notification-tabs" aria-label="Filtro de notificações"><button type="button" className={tab === "new" ? "active" : ""} onClick={() => setTab("new")}>Novas{unread.length ? <b>{unread.length}</b> : null}</button><button type="button" className={tab === "read" ? "active" : ""} onClick={() => setTab("read")}>Lidas</button>{unread.length ? <button type="button" className="athlete-portal-notification-read-all" onClick={markAllRead} disabled={pending}>Ler tudo</button> : null}</nav>{visible.length ? <div>{visible.map((item) => <Link href={item.href} key={item.id} onClick={() => { if (!item.isRead) acknowledge(item); setOpen(false); }}><i className={`is-${item.source.toLowerCase()}`} aria-hidden="true">{iconBySource[item.source]}</i><span><strong>{item.title}</strong><small>{item.message}</small></span><em>Ver</em></Link>)}</div> : <p>{tab === "new" ? "Nenhuma novidade por enquanto." : "Ainda não há notificações lidas."}</p>}</section> : null}</div>;
}
