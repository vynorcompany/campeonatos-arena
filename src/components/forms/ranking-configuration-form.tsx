"use client";
import { viewStyles } from "./ranking-configuration-form.utilities";

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
    <div className={viewStyles.stack_md}>
      <form action={formAction} className={viewStyles.grid_form_section_card_ranking_configuration_form}>
        <div className={viewStyles.form_full_ranking_configuration_heading}><h2>Dados do ranking</h2><p className={viewStyles.muted}>Defina como o ranking identifica e pontua as competições.</p></div>
        <input type="hidden" name="rankingId" value={ranking.id} />
        <input type="hidden" name="generalSettingsPresent" value="on" />
        <div className={viewStyles.field}>
          <label htmlFor="ranking-name">Nome do ranking</label>
          <input id="ranking-name" name="name" defaultValue={ranking.name} required />
        </div>
        <div className={viewStyles.field_form_full}>
          <label htmlFor="ranking-description">Descrição</label>
          <input id="ranking-description" name="description" defaultValue={ranking.description} />
        </div>
        <div className={viewStyles.field}>
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
        <div className={viewStyles.field}>
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
        <div className={viewStyles.ranking_general_options_form_full}>
        <label className={viewStyles.ranking_general_control}>
          <input
            name="isGeneral"
            type="checkbox"
            defaultChecked={ranking.isGeneral}
            disabled={type !== "INDIVIDUAL"}
          />
          <span className={viewStyles.ranking_general_control_copy}>
            <strong>Ranking Geral da arena</strong>
            <small>Somente um ranking individual pode ser o Ranking Geral público.</small>
          </span>
        </label>
        <label className={viewStyles.ranking_general_control}>
          <input
            name="feedsGeneralRanking"
            type="checkbox"
            defaultChecked={ranking.feedsGeneralRanking}
            disabled={type !== "PAIR"}
          />
          <span className={viewStyles.ranking_general_control_copy}>
            <strong>Alimentar o Ranking Geral</strong>
            <small>As categorias vinculadas também pontuam o Ranking Geral individual.</small>
          </span>
        </label>
        </div>
        <p className={viewStyles.muted_form_full}>
          {formatLocked
            ? "Tipo e modelo estão protegidos porque já existe uma competição de categoria iniciada. Nome, descrição e opções do Geral continuam editáveis."
            : "Tipo e modelo podem ser ajustados enquanto todas as categorias vinculadas estiverem em rascunho."}
        </p>
        {state?.error ? <p className={viewStyles.form_error_form_full} role="alert">{state.error}</p> : null}
        {state?.success ? <p className={viewStyles.form_success_form_full}>{state.success}</p> : null}
        <div className={viewStyles.section_actions_form_full}>
          <SubmitButton label="Salvar configuração" pendingLabel="Salvando..." className={viewStyles.button_button_primary} />
        </div>
      </form>

      <SafeActionForm
        action={deleteRankingProfileAction}
        className={viewStyles.section_card}
        confirmKeyword="EXCLUIR"
        confirmPrompt="Digite EXCLUIR para apagar este ranking. Essa ação não pode ser desfeita."
        successMessage="Ranking excluído."
        successHref="/torneios/rankings"
      >
        <input type="hidden" name="rankingId" value={ranking.id} />
        <div>
          <h3>Excluir ranking</h3>
          <p className={viewStyles.muted}>Use apenas quando este ranking não será mais utilizado.</p>
        </div>
        <div className={viewStyles.section_actions}><button type="submit" className={viewStyles.button_button_danger}>Excluir ranking</button></div>
      </SafeActionForm>
    </div>
  );
}
