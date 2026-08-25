"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { markAllArenaNotificationsReadAction, markArenaNotificationReadAction } from "@/lib/actions/notifications";

type Notification = { id: string; title: string; message: string; href: string; createdAt: Date };

export function ArenaNotificationBell({ notifications }: { notifications: Notification[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [unread, setUnread] = useState(notifications);
  useEffect(() => setUnread(notifications), [notifications]);
  const markRead = (notificationId: string) => {
    setUnread((current) => current.filter((notification) => notification.id !== notificationId));
    startTransition(async () => { await markArenaNotificationReadAction(notificationId); router.refresh(); });
  };
  const markAllRead = () => {
    setUnread([]);
    startTransition(async () => { await markAllArenaNotificationsReadAction(); router.refresh(); });
  };
  return <div className="arena-notification-bell"><button type="button" aria-label="Notificações" aria-expanded={open} onClick={() => setOpen((current) => !current)}>🔔{unread.length ? <b>{unread.length > 9 ? "9+" : unread.length}</b> : null}</button>{open ? <section className="arena-notification-panel"><header><div><strong>Notificações</strong><span>{pending ? "Atualizando..." : unread.length ? `${unread.length} não lida${unread.length === 1 ? "" : "s"}` : "Você está em dia"}</span></div>{unread.length ? <button type="button" onClick={markAllRead} disabled={pending}>Marcar todas como lidas</button> : null}</header>{unread.length ? unread.map((notification) => <Link href={notification.href || "/agenda"} key={notification.id} onClick={() => { markRead(notification.id); setOpen(false); }}><strong>{notification.title}</strong><span>{notification.message}</span></Link>) : <p>Você está em dia.</p>}</section> : null}</div>;
}
