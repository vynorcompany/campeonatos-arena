"use client";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./event-quick-actions.utilities";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EventIcon } from "@/components/tournaments/event-icon";
import { TournamentEventEditForm } from "@/components/tournaments/tournament-event-edit-form";

type ActionKey = "categories" | "registrations" | "games" | "public" | "edit";

type EventQuickActionsProps = {
  tournament: { id: string; name: string; description: string; rules: string };
  publicPageUrl: string;
  categories: { id: string; name: string; pairCount: number }[];
  initialAction?: ActionKey | null;
};

const actionCopy: Record<ActionKey, { title: string; icon: "sliders" | "users" | "calendar" | "globe" | "edit"; tone?: "success" | "purple" }> = {
  categories: { title: "Configurar categorias", icon: "sliders" },
  registrations: { title: "Gerenciar inscrições", icon: "users", tone: "success" },
  games: { title: "Programar jogos", icon: "calendar" },
  public: { title: "Página pública", icon: "globe", tone: "purple" },
  edit: { title: "Editar evento", icon: "edit" },
};

export function EventQuickActions({ tournament, publicPageUrl, categories, initialAction = null }: EventQuickActionsProps) {
  const [activeAction, setActiveAction] = useState<ActionKey | null>(initialAction);

  useEffect(() => {
    setActiveAction(initialAction);
  }, [initialAction]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveAction(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const activeCopy = activeAction ? actionCopy[activeAction] : null;

  return <section className={viewStyles.event_quick_actions} id="acoes-rapidas">
    <header><EventIcon name="bolt" /><h2>Ações rápidas</h2></header>
    {(Object.keys(actionCopy) as ActionKey[]).map((key) => {
      const action = actionCopy[key];
      if (key === "categories") return <Link href={`/torneios/${tournament.id}/categorias`} className={viewStyles.event_quick_action_button} key={key}>
        <span className={cx(`${viewStyles.event_quick_action_icon}${action.tone ? ` event-quick-action-icon-${action.tone}` : ""}`)}><EventIcon name={action.icon} /></span><strong>{action.title}</strong><EventIcon name="chevron" />
      </Link>;
      if (key === "registrations") return <Link href={`/torneios/${tournament.id}/inscricoes`} className={viewStyles.event_quick_action_button} key={key}>
        <span className={cx(`${viewStyles.event_quick_action_icon}${action.tone ? ` event-quick-action-icon-${action.tone}` : ""}`)}><EventIcon name={action.icon} /></span><strong>{action.title}</strong><EventIcon name="chevron" />
      </Link>;
      if (key === "games") return <Link href={`/torneios/${tournament.id}/jogos`} className={viewStyles.event_quick_action_button} key={key}>
        <span className={cx(`${viewStyles.event_quick_action_icon}${action.tone ? ` event-quick-action-icon-${action.tone}` : ""}`)}><EventIcon name={action.icon} /></span><strong>{action.title}</strong><EventIcon name="chevron" />
      </Link>;
      return <button type="button" className={viewStyles.event_quick_action_button} key={key} onClick={() => setActiveAction(key)}>
        <span className={cx(`${viewStyles.event_quick_action_icon}${action.tone ? ` event-quick-action-icon-${action.tone}` : ""}`)}><EventIcon name={action.icon} /></span>
        <strong>{action.title}</strong><EventIcon name="chevron" />
      </button>;
    })}

    {activeAction && activeCopy ? <div className={viewStyles.event_action_modal_backdrop} role="presentation" onMouseDown={() => setActiveAction(null)}>
      <section className={viewStyles.event_action_modal} role="dialog" aria-modal="true" aria-label={activeCopy.title} onMouseDown={(event) => event.stopPropagation()}>
        <header><div><p className={viewStyles.eyebrow}>EVENTO</p><h2>{activeCopy.title}</h2></div><button type="button" className={viewStyles.button_button_small} onClick={() => setActiveAction(null)}>Fechar</button></header>
        <div className={viewStyles.event_action_modal_content}>
          {activeAction === "public" ? <div className={viewStyles.event_action_public_page}><p>Confira a visualização publicada para atletas e público.</p><Link href={publicPageUrl} target="_blank" rel="noreferrer" className={viewStyles.button_button_primary}><EventIcon name="external" />Abrir página pública</Link></div> : null}
          {activeAction === "edit" ? <TournamentEventEditForm tournament={tournament} /> : null}
        </div>
      </section>
    </div> : null}
  </section>;
}
