"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/stat-card";

type PortalUser = { id: string; name: string; phone: string; email: string; createdAt: string };

export function DashboardPortalUsersCard({ users }: { users: PortalUser[] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);
  return <>
    <button type="button" className="dashboard-stat-trigger" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={`Ver ${users.length} novos usuários do portal`}>
      <StatCard label="Novos usuários do portal" value={users.length} caption="Cadastros no período selecionado" />
      <span className="dashboard-stat-trigger-hint">Ver usuários</span>
    </button>
    {open ? <div className="dashboard-metric-modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
      <section className="dashboard-metric-modal" role="dialog" aria-modal="true" aria-labelledby="portal-users-title" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><p className="eyebrow">CADASTROS DO PORTAL</p><h2 id="portal-users-title">Novos usuários</h2><p>Usuários que criaram acesso no período selecionado.</p></div><button type="button" className="button button-small" onClick={() => setOpen(false)}>Fechar</button></header>
        {users.length ? <div className="dashboard-portal-user-list">{users.map((user) => <article key={user.id}><span className="dashboard-portal-user-avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.phone || user.email || "Contato não informado"}</small></div><time dateTime={user.createdAt}>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(user.createdAt))}</time></article>)}</div> : <p className="dashboard-metric-empty">Nenhum usuário criou acesso ao Portal neste período.</p>}
      </section>
    </div> : null}
  </>;
}
