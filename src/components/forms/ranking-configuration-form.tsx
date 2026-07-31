"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  deleteRankingProfileAction,
  updateRankingConfigurationAction,
  type RankingActionState,
} from "@/lib/actions/tournament";

const initialState: RankingActionState = { error: null, success: null };

export function RankingConfigurationForm({
  ranking,
  formatLocked,
}: {
  ranking: {
    id: string;
    name: string;
    description: string;
    type: "PAIR" | "INDIVIDUAL";
    model: "LEAGUE" | "KNOCKOUT";
    isGeneral: boolean;
    feedsGeneralRanking: boolean;
  };
  formatLocked: boolean;
}) {
  const [state, formAction] = useFormState(
    updateRankingConfigurationAction,
    initialState,
  );
  const [type, setType] = useState(ranking.type);

  return (
    <div className="stack-md">
      <form action={formAction} className="grid-form">
        <input type="hidden" name="rankingId" value={ranking.id} />
        <input type="hidden" name="generalSettingsPresent" value="on" />
        <div className="field">
          <label htmlFor="ranking-name">Nome do ranking</label>
          <input id="ranking-name" name="name" defaultValue={ranking.name} required />
        </div>
        <div className="field form-full">
          <label htmlFor="ranking-description">Descrição</label>
          <input id="ranking-description" name="description" defaultValue={ranking.description} />
        </div>
        <div className="field">
          <label htmlFor="ranking-type">Tipo do ranking</label>
          <select
            id="ranking-type"
            name="type"
            value={type}
            disabled={formatLocked}
            onChange={(event) =>
              setType(event.currentTarget.value as "PAIR" | "INDIVIDUAL")
            }
          >
            <option value="PAIR">Duplas</option>
            <option value="INDIVIDUAL">Individual</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="ranking-model">Modelo de pontuação</label>
          <select
            id="ranking-model"
            name="model"
            defaultValue={ranking.model}
            disabled={formatLocked}
          >
            <option value="LEAGUE">Liga</option>
            <option value="KNOCKOUT">Mata-mata</option>
          </select>
        </div>
        <div className="ranking-general-options form-full">
        <label className="ranking-general-control">
          <input
            name="isGeneral"
            type="checkbox"
            defaultChecked={ranking.isGeneral}
            disabled={type !== "INDIVIDUAL"}
          />
          <span className="ranking-general-control-copy">
            <strong>Ranking Geral da arena</strong>
            <small>Somente um ranking individual pode ser o Ranking Geral público.</small>
          </span>
        </label>
        <label className="ranking-general-control">
          <input
            name="feedsGeneralRanking"
            type="checkbox"
            defaultChecked={ranking.feedsGeneralRanking}
            disabled={type !== "PAIR"}
          />
          <span className="ranking-general-control-copy">
            <strong>Alimentar o Ranking Geral</strong>
            <small>As categorias vinculadas também pontuam o Ranking Geral individual.</small>
          </span>
        </label>
        </div>
        <p className="muted form-full">
          {formatLocked
            ? "Tipo e modelo estão protegidos porque já existe uma competição de categoria iniciada. Nome, descrição e opções do Geral continuam editáveis."
            : "Tipo e modelo podem ser ajustados enquanto todas as categorias vinculadas estiverem em rascunho."}
        </p>
        {state?.error ? <p className="form-error form-full" role="alert">{state.error}</p> : null}
        {state?.success ? <p className="form-success form-full">{state.success}</p> : null}
        <div className="section-actions form-full">
          <SubmitButton label="Salvar configuração" pendingLabel="Salvando..." className="button button-primary" />
        </div>
      </form>

      <SafeActionForm
        action={deleteRankingProfileAction}
        className="section-card stack-sm"
        confirmKeyword="EXCLUIR"
        confirmPrompt="Digite EXCLUIR para apagar este ranking. Essa ação não pode ser desfeita."
        successMessage="Ranking excluído."
        successHref="/torneios/rankings"
      >
        <input type="hidden" name="rankingId" value={ranking.id} />
        <div>
          <h3>Excluir ranking</h3>
          <p className="muted">Use apenas quando este ranking não será mais utilizado.</p>
        </div>
        <div className="section-actions"><button type="submit" className="button button-danger">Excluir ranking</button></div>
      </SafeActionForm>
    </div>
  );
}
