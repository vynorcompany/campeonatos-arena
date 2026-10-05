"use client";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./upcoming-matches-showcase.utilities";

import { useEffect, useState } from "react";

type UpcomingMatch = {
  id: string;
  label: string;
  stageLabel: string;
  groupName: string | null;
  homePairName: string | null;
  awayPairName: string | null;
  courtName: string | null;
  orderLabel: string;
};

type UpcomingMatchesShowcaseProps = {
  tournamentName: string;
  stageTitle: string;
  stageDescription: string;
  matches: UpcomingMatch[];
};

export function UpcomingMatchesShowcase({
  tournamentName,
  stageTitle,
  stageDescription,
  matches
}: UpcomingMatchesShowcaseProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [matches.length]);

  useEffect(() => {
    if (matches.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % matches.length);
    }, 8000);

    return () => window.clearInterval(timer);
  }, [matches.length]);

  if (!matches.length) {
    return (
      <section className={viewStyles.showcase_shell_showcase_shell_empty}>
        <div className={viewStyles.showcase_hero}>
          <div className={viewStyles.showcase_kicker_row}>
            <span className={viewStyles.showcase_kicker}>Próximos jogos</span>
            <span className={viewStyles.showcase_badge}>Aguardando agenda</span>
          </div>
          <h2>{tournamentName}</h2>
          <p>{stageDescription}</p>
        </div>

        <article className={viewStyles.showcase_empty_card}>
          <strong>Nenhum confronto pendente no momento</strong>
          <p>Assim que a fase atual tiver partidas disponíveis, elas aparecem aqui em formato de apresentação.</p>
        </article>
      </section>
    );
  }

  const activeMatch = matches[activeIndex];

  return (
    <section className={viewStyles.showcase_shell}>
      <div className={viewStyles.showcase_hero}>
        <div className={viewStyles.showcase_kicker_row}>
          <span className={viewStyles.showcase_kicker}>Próximos jogos</span>
          <span className={viewStyles.showcase_badge}>
            {activeIndex + 1}/{matches.length}
          </span>
        </div>
        <h2>{tournamentName}</h2>
        <p>
          {stageTitle} • {stageDescription}
        </p>
      </div>

      <div className={viewStyles.showcase_stage}>
        <div className={viewStyles.showcase_stage_head}>
          <div>
            <span className={viewStyles.showcase_stage_label}>{activeMatch.stageLabel}</span>
            <h3>{activeMatch.label}</h3>
          </div>
          <span className={viewStyles.showcase_order}>{activeMatch.orderLabel}</span>
        </div>

        <div className={viewStyles.showcase_versus}>
          <article className={viewStyles.showcase_team_card}>
            <span className={viewStyles.showcase_team_caption}>Dupla 1</span>
            <strong>{activeMatch.homePairName ?? "A definir"}</strong>
          </article>

          <div className={viewStyles.showcase_versus_badge}>VS</div>

          <article className={viewStyles.showcase_team_card}>
            <span className={viewStyles.showcase_team_caption}>Dupla 2</span>
            <strong>{activeMatch.awayPairName ?? "A definir"}</strong>
          </article>
        </div>

        <div className={viewStyles.showcase_meta_grid}>
          <div className={viewStyles.showcase_meta_card}>
            <span>Contexto</span>
            <strong>{activeMatch.groupName ?? activeMatch.stageLabel}</strong>
          </div>
          <div className={viewStyles.showcase_meta_card}>
            <span>Quadra</span>
            <strong>{activeMatch.courtName ?? "A definir"}</strong>
          </div>
        </div>

        <div className={viewStyles.showcase_controls}>
          <button
            type="button"
            className={viewStyles.button}
            onClick={() => setActiveIndex((current) => (current - 1 + matches.length) % matches.length)}
          >
            Anterior
          </button>
          <div className={viewStyles.showcase_dots} aria-label="Slides dos próximos jogos">
            {matches.map((match, index) => (
              <button
                key={match.id}
                type="button"
                className={cx(`${viewStyles.showcase_dot}${index === activeIndex ? " " + viewStyles.showcase_dot_active : ""}`)}
                onClick={() => setActiveIndex(index)}
                aria-label={`Abrir slide ${index + 1}`}
              />
            ))}
          </div>
          <button
            type="button"
            className={viewStyles.button_button_primary}
            onClick={() => setActiveIndex((current) => (current + 1) % matches.length)}
          >
            Próximo
          </button>
        </div>
      </div>

      <div className={viewStyles.showcase_filmstrip} aria-label="Fila de próximos jogos">
        {matches.map((match, index) => (
          <button
            key={`${match.id}-thumb`}
            type="button"
            className={cx(`${viewStyles.showcase_thumb}${index === activeIndex ? " " + viewStyles.showcase_thumb_active : ""}`)}
            onClick={() => setActiveIndex(index)}
          >
            <span>{match.stageLabel}</span>
            <strong>{match.homePairName ?? "A definir"} x {match.awayPairName ?? "A definir"}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}
