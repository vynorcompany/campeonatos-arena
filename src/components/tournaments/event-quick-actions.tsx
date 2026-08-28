"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentProps } from "react";
import { TournamentCategoryManagerForm } from "@/components/forms/tournament-category-manager-form";
import { EventIcon } from "@/components/tournaments/event-icon";
import { TournamentEventEditForm } from "@/components/tournaments/tournament-event-edit-form";

type ActionKey = "categories" | "registrations" | "public" | "edit";

type EventQuickActionsProps = {
  tournament: { id: string; name: string; description: string; rules: string };
  publicPageUrl: string;
  categories: { id: string; name: string; pairCount: number }[];
  categoryManager: ComponentProps<typeof TournamentCategoryManagerForm>;
  initialAction?: ActionKey | null;
};

const actionCopy: Record<ActionKey, { title: string; icon: "sliders" | "users" | "globe" | "edit"; tone?: "success" | "purple" }> = {
  categories: { title: "Configurar categorias", icon: "sliders" },
  registrations: { title: "Gerenciar inscrições", icon: "users", tone: "success" },
  public: { title: "Página pública", icon: "globe", tone: "purple" },
  edit: { title: "Editar evento", icon: "edit" },
};

export function EventQuickActions({ tournament, publicPageUrl, categories, categoryManager, initialAction = null }: EventQuickActionsProps) {
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

  return <section className="event-quick-actions" id="acoes-rapidas">
    <header><EventIcon name="bolt" /><h2>Ações rápidas</h2></header>
    {(Object.keys(actionCopy) as ActionKey[]).map((key) => {
      const action = actionCopy[key];
      return <button type="button" className="event-quick-action-button" key={key} onClick={() => setActiveAction(key)}>
        <span className={`event-quick-action-icon${action.tone ? ` event-quick-action-icon-${action.tone}` : ""}`}><EventIcon name={action.icon} /></span>
        <strong>{action.title}</strong><EventIcon name="chevron" />
      </button>;
    })}

    {activeAction && activeCopy ? <div className="event-action-modal-backdrop" role="presentation" onMouseDown={() => setActiveAction(null)}>
      <section className="event-action-modal" role="dialog" aria-modal="true" aria-label={activeCopy.title} onMouseDown={(event) => event.stopPropagation()}>
        <header><div><p className="eyebrow">EVENTO</p><h2>{activeCopy.title}</h2></div><button type="button" className="button button-small" onClick={() => setActiveAction(null)}>Fechar</button></header>
        <div className="event-action-modal-content">
          {activeAction === "categories" ? <TournamentCategoryManagerForm {...categoryManager} /> : null}
          {activeAction === "registrations" ? <div className="event-action-category-list">{categories.length ? categories.map((category) => <article key={category.id}><div><strong>{category.name}</strong><span>{category.pairCount} dupla(s) inscrita(s)</span></div><Link className="button button-small" href={`/torneios/${tournament.id}/categorias/${category.id}?tab=registrations`} onClick={() => setActiveAction(null)}>Abrir inscrições</Link></article>) : <p className="muted">Nenhuma categoria cadastrada.</p>}</div> : null}
          {activeAction === "public" ? <div className="event-action-public-page"><p>Confira a visualização publicada para atletas e público.</p><Link href={publicPageUrl} target="_blank" rel="noreferrer" className="button button-primary"><EventIcon name="external" />Abrir página pública</Link></div> : null}
          {activeAction === "edit" ? <TournamentEventEditForm tournament={tournament} /> : null}
        </div>
      </section>
    </div> : null}
  </section>;
}
