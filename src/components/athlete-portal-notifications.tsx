"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markPublicPlayerNotificationReadAction } from "@/lib/actions/public-player-notifications";
import type { AthletePortalNotification } from "@/lib/services/public-player-notifications";

const iconBySource = { PLAYER: "✦", ARENA: "▣", FINANCE: "R$" };

export function AthletePortalNotifications({ arenaSlug, notifications }: { arenaSlug: string; notifications: AthletePortalNotification[] }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(notifications);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const acknowledge = (item: AthletePortalNotification) => {
    if (item.source !== "PLAYER") return;
    setItems((current) => current.filter((notification) => notification.id !== item.id));
    startTransition(async () => { await markPublicPlayerNotificationReadAction(arenaSlug, item.id); router.refresh(); });
  };
  return <div className="athlete-portal-notifications"><button type="button" className="athlete-portal-notification-trigger" aria-label="Notificações" aria-expanded={open} onClick={() => setOpen((current) => !current)}><span aria-hidden="true">🔔</span>{items.length ? <b>{items.length > 9 ? "9+" : items.length}</b> : null}</button>{open ? <section className="athlete-portal-notification-modal" role="dialog" aria-label="Notificações"><header><div><strong>Notificações</strong><span>{pending ? "Atualizando..." : items.length ? "Tudo que precisa da sua atenção" : "Você está em dia"}</span></div><button type="button" aria-label="Fechar notificações" onClick={() => setOpen(false)}>×</button></header>{items.length ? <div>{items.map((item) => <Link href={item.href} key={item.id} onClick={() => { acknowledge(item); setOpen(false); }}><i className={`is-${item.source.toLowerCase()}`} aria-hidden="true">{iconBySource[item.source]}</i><span><strong>{item.title}</strong><small>{item.message}</small></span><em>Ver</em></Link>)}</div> : <p>Sem novidades por enquanto.</p>}</section> : null}</div>;
}
