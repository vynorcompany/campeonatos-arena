"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { markArenaNotificationsReadAction } from "@/lib/actions/notifications";

type Notification = { id: string; title: string; message: string; href: string; createdAt: Date };

export function ArenaNotificationBell({ notifications }: { notifications: Notification[] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const show = () => { setOpen((current) => !current); if (!open && notifications.length) startTransition(() => markArenaNotificationsReadAction()); };
  return <div className="arena-notification-bell"><button type="button" aria-label="Notificações" aria-expanded={open} onClick={show}>🔔{notifications.length ? <b>{notifications.length > 9 ? "9+" : notifications.length}</b> : null}</button>{open ? <section className="arena-notification-panel"><header><strong>Notificações</strong><span>{pending ? "Atualizando..." : notifications.length ? "Novas reservas" : "Nenhuma nova"}</span></header>{notifications.length ? notifications.map((notification) => <Link href={notification.href || "/agenda"} key={notification.id} onClick={() => setOpen(false)}><strong>{notification.title}</strong><span>{notification.message}</span></Link>) : <p>Você está em dia.</p>}</section> : null}</div>;
}
