"use client";

import { SafeActionForm } from "@/components/forms/safe-action-form";
import {
  deleteRankingProfileAction,
  updateRankingConfigurationAction,
} from "@/lib/actions/tournament";

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
  const typeLabel = ranking.type === "PAIR" ? "Duplas" : "Individual";
  const modelLabel = ranking.model === "LEAGUE" ? "Liga" : "Mata-mata";

  return (
    <div className="stack-md">
      <SafeActionForm
        action={updateRankingConfigurationAction}
        className="grid-form"
        successMessage="Configuração salva com sucesso."
      >
        <input type="hidden" name="rankingId" value={ranking.id} />
        <div className="field">
          <label htmlFor="ranking-name">Nome do ranking</label>
          <input id="ranking-name" name="name" defaultValue={ranking.name} required />
        </div>
        <div className="field form-full">
          <label htmlFor="ranking-description">Descrição</label>
          <input id="ranking-description" name="description" defaultValue={ranking.description} />
        </div>
        <div className="simple-list form-full">
          <div className="simple-item"><strong>Tipo</strong><span>{typeLabel}</span></div>
          <div className="simple-item"><strong>Modelo</strong><span>{modelLabel}</span></div>
          {ranking.isGeneral ? <div className="simple-item"><strong>Ranking Geral</strong><span>Este é o ranking geral público da arena.</span></div> : null}
          {ranking.feedsGeneralRanking ? <div className="simple-item"><strong>Alimenta o Geral</strong><span>As categorias vinculadas também pontuam o Ranking Geral.</span></div> : null}
        </div>
        <p className="muted form-full">
          {formatLocked
            ? "Tipo e modelo estão protegidos porque já existe uma competição de categoria iniciada."
            : "Tipo e modelo definem o formato do ranking e são exibidos como contexto nesta área."}
        </p>
        <div className="section-actions form-full">
          <button type="submit" className="button button-primary">Salvar configuração</button>
        </div>
      </SafeActionForm>

      <SafeActionForm
        action={deleteRankingProfileAction}
        className="section-card stack-sm"
        confirmKeyword="EXCLUIR"
        confirmPrompt="Digite EXCLUIR para apagar este ranking. Essa ação não pode ser desfeita."
        successMessage="Ranking excluído."
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
