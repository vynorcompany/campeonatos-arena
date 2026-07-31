"use client";

import { SafeActionForm } from "@/components/forms/safe-action-form";
import { updateRankingPointsAction } from "@/lib/actions/tournament";

type Rule = { stageKey: string; points: number };

const fieldByStage = {
  CHAMPION: "championPoints",
  RUNNER_UP: "runnerUpPoints",
  THIRD: "thirdPoints",
  SEMIFINAL: "semifinalPoints",
  QUARTERFINAL: "quarterfinalPoints",
  PARTICIPATION: "participationPoints",
} as const;

const labelByStage = {
  CHAMPION: "1º lugar",
  RUNNER_UP: "2º lugar",
  THIRD: "3º lugar",
  SEMIFINAL: "Semifinal",
  QUARTERFINAL: "Quartas de final",
  PARTICIPATION: "Participação",
} as const;

export function RankingPointsForm({
  ranking,
}: {
  ranking: {
    id: string;
    model: "LEAGUE" | "KNOCKOUT";
    rules: Rule[];
  };
}) {
  const rules = ranking.rules.filter((rule) =>
    ranking.model === "LEAGUE"
      ? rule.stageKey !== "SEMIFINAL" && rule.stageKey !== "QUARTERFINAL"
      : rule.stageKey !== "THIRD",
  );

  return (
    <SafeActionForm action={updateRankingPointsAction} className="grid-form" successMessage="Pontuação salva com sucesso.">
      <input type="hidden" name="rankingId" value={ranking.id} />
      <p className="muted form-full">
        {ranking.model === "LEAGUE" ? "Distribua os pontos da classificação da liga." : "Distribua os pontos por fase do mata-mata."}
      </p>
      {rules.map((rule) => {
        const stage = rule.stageKey as keyof typeof fieldByStage;
        return (
          <div className="field" key={rule.stageKey}>
            <label htmlFor={`rule-${rule.stageKey}`}>{labelByStage[stage]}</label>
            <input id={`rule-${rule.stageKey}`} name={fieldByStage[stage]} type="number" min="0" max="5000" defaultValue={rule.points} required />
          </div>
        );
      })}
      <div className="section-actions form-full"><button type="submit" className="button button-primary">Salvar pontuação</button></div>
    </SafeActionForm>
  );
}
