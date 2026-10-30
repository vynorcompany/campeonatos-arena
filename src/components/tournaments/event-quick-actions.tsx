"use client";
import { Modal } from "@/components/ui/modal";

import { viewStyles } from "./event-quick-actions.utilities";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EventIcon } from "@/components/tournaments/event-icon";
import { TournamentEventEditForm } from "@/components/tournaments/tournament-event-edit-form";

type ActionKey = "categories" | "registrations" | "games" | "public" | "edit";

type EventQuickActionsProps = {
  tournament: { id: string; name: string; description: string; rules: string };
  publicPageUrl: string;
  categories: { id: string; name: string; pairCount: number }[];
  initialAction?: ActionKey | null;
};

const actionCopy: Record<ActionKey, { title: string; icon: "sliders" | "users" | "calendar" | "globe" | "edit" }> = {
  categories: { title: "Configurar categorias", icon: "sliders" },
  registrations: { title: "Gerenciar inscrições", icon: "users" },
  games: { title: "Programar jogos", icon: "calendar" },
  public: { title: "Página pública", icon: "globe" },
  edit: { title: "Editar evento", icon: "edit" },
};

export function EventQuickActions({ tournament, publicPageUrl, categories, initialAction = null }: EventQuickActionsProps) {
  const [activeAction, setActiveAction] = useState<ActionKey | null>(initialAction);

  useEffect(() => {
    setActiveAction(initialAction);
  }, [initialAction]);

  const close = useCallback(() => setActiveAction(null), []);

  const activeCopy = activeAction ? actionCopy[activeAction] : null;

  return <section className={viewStyles.event_quick_actions} id="acoes-rapidas">
    <header><EventIcon name="bolt" /><h2>Ações rápidas</h2></header>
    {(Object.keys(actionCopy) as ActionKey[]).map((key) => {
      const action = actionCopy[key];
      if (key === "categories") return <Link href={`/torneios/${tournament.id}/categorias`} className={viewStyles.event_quick_action_button} aria-label={action.title} key={key}>
        <span className={viewStyles.event_quick_action_icon}><EventIcon name={action.icon} /></span><strong>{action.title}</strong><EventIcon name="chevron" />
      </Link>;
      if (key === "registrations") return <Link href={`/torneios/${tournament.id}/inscricoes`} className={viewStyles.event_quick_action_button} aria-label={action.title} key={key}>
        <span className={viewStyles.event_quick_action_icon}><EventIcon name={action.icon} /></span><strong>{action.title}</strong><EventIcon name="chevron" />
      </Link>;
      if (key === "games") return <Link href={`/torneios/${tournament.id}/jogos`} className={viewStyles.event_quick_action_button} aria-label={action.title} key={key}>
        <span className={viewStyles.event_quick_action_icon}><EventIcon name={action.icon} /></span><strong>{action.title}</strong><EventIcon name="chevron" />
      </Link>;
      return <button type="button" className={viewStyles.event_quick_action_button} aria-label={action.title} key={key} onClick={() => setActiveAction(key)}>
        <span className={viewStyles.event_quick_action_icon}><EventIcon name={action.icon} /></span>
        <strong>{action.title}</strong><EventIcon name="chevron" />
      </button>;
    })}

    <Modal title={activeCopy?.title ?? "Evento"} width="tw:max-w-[720px]" open={Boolean(activeAction && activeCopy)} onClose={close}>
      {activeAction === "public" ? <div className={viewStyles.event_action_public_page}><Link href={publicPageUrl} target="_blank" rel="noreferrer" className={viewStyles.button_button_primary}><EventIcon name="external" />Abrir página pública</Link></div> : null}
      {activeAction === "edit" ? <TournamentEventEditForm tournament={tournament} /> : null}
    </Modal>
  </section>;
}
