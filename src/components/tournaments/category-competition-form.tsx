import Link from "next/link";
import { SubmitButton } from "@/components/forms/submit-button";
import { StatusBadge } from "@/components/tournaments/status-badge";
import { createCategoryCompetitionAction } from "@/lib/actions/category-competition";
import { canGenerateCategoryDraw } from "@/lib/tournament-category/draw";
import {
  CATEGORY_CLASS_OPTIONS,
  CATEGORY_GENDER_OPTIONS,
} from "@/lib/tournament-category/options";

type PairRankingOption = {
  id: string;
  name: string;
};

type CategoryCompetitionFormProps = {
  categoryId: string;
  categoryName: string;
  pairRankings: PairRankingOption[];
};

type CategoryCompetitionCardProps = {
  tournamentId: string;
  categoryId: string;
  category: {
    id: string;
    name: string;
    class: string;
    gender: string;
    competition: {
      format: "LEAGUE" | "THREE_GROUPS" | "FOUR_GROUPS" | "SIMPLE";
      status: string;
      feedsGeneralRanking: boolean;
      rankingName: string | null;
      pairCount: number;
      groupCount: number;
      matchCount: number;
      completedMatchCount: number;
    } | null;
  };
};

const formatLabels = {
  LEAGUE: "Liga",
  THREE_GROUPS: "3 grupos",
  FOUR_GROUPS: "4 grupos",
  SIMPLE: "Simples (grupos de 3 e 4)",
} as const;

export function CategoryCompetitionForm({
  categoryId,
  categoryName,
  pairRankings,
}: CategoryCompetitionFormProps) {
  return (
    <form action={createCategoryCompetitionAction} className="grid-form">
      <input type="hidden" name="categoryId" value={categoryId} />

      <div className="field form-full">
        <strong>Configurar {categoryName}</strong>
        <p className="muted">
          Classe, gênero e formato ficam congelados depois que a competição é
          criada.
        </p>
      </div>

      <div className="field">
        <label htmlFor={`class-${categoryId}`}>Classe</label>
        <select id={`class-${categoryId}`} name="class" required defaultValue="">
          <option value="">Selecione</option>
          {CATEGORY_CLASS_OPTIONS.map((className) => (
            <option key={className} value={className}>
              {className}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor={`gender-${categoryId}`}>Gênero</label>
        <select id={`gender-${categoryId}`} name="gender" required>
          <option value="">Selecione</option>
          {CATEGORY_GENDER_OPTIONS.map((gender) => (
            <option key={gender.value} value={gender.value}>
              {gender.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor={`format-${categoryId}`}>Formato</label>
        <select id={`format-${categoryId}`} name="format" defaultValue="LEAGUE">
          <option value="LEAGUE">Liga</option>
          <option value="THREE_GROUPS">3 grupos</option>
          <option value="FOUR_GROUPS">4 grupos</option>
          <option value="SIMPLE">Simples (grupos de 3 e 4)</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor={`ranking-${categoryId}`}>Ranking de duplas</label>
        <select id={`ranking-${categoryId}`} name="rankingId" defaultValue="">
          <option value="">Sem ranking</option>
          {pairRankings.map((ranking) => (
            <option key={ranking.id} value={ranking.id}>
              {ranking.name}
            </option>
          ))}
        </select>
      </div>

      <label className="field field-inline form-full">
        <input type="checkbox" name="feedsGeneralRanking" />
        <span>Também pontuar o Ranking Geral individual</span>
      </label>

      <div className="field field-submit form-full">
        <SubmitButton
          label="Criar competição da categoria"
          pendingLabel="Criando..."
          className="button button-primary"
        />
      </div>
    </form>
  );
}

export function CategoryCompetitionCard({
  tournamentId,
  categoryId,
  category,
}: CategoryCompetitionCardProps) {
  const competition = category.competition;
  const nextStep = !competition
    ? {
        label: "Configurar categoria",
        href: `/torneios/${tournamentId}/categorias/${categoryId}?tab=overview`,
      }
    : competition.status === "FINISHED"
      ? null
      : competition.status === "PUBLISHED"
        ? {
            label:
              competition.matchCount > 0 &&
              competition.completedMatchCount === competition.matchCount
                ? "Encerrar categoria"
                : "Registrar resultados",
            href: `/torneios/${tournamentId}/categorias/${categoryId}?tab=${competition.matchCount > 0 && competition.completedMatchCount === competition.matchCount ? "results" : "games"}`,
          }
        : !canGenerateCategoryDraw(
              competition.format,
              competition.pairCount,
            )
          ? {
              label: "Adicionar duplas",
              href: `/torneios/${tournamentId}/categorias/${categoryId}?tab=registrations`,
            }
          : competition.groupCount === 0
            ? {
                label: "Gerar grupos",
                href: `/torneios/${tournamentId}/categorias/${categoryId}?tab=groups`,
              }
            : {
                label: "Publicar tabela",
                href: `/torneios/${tournamentId}/categorias/${categoryId}?tab=groups`,
              };

  return (
    <article id={`category-${category.id}`} className="section-card stack-sm">
      <div className="page-header">
        <div className="stack-xs">
          <h3>{category.name}</h3>
          <p className="muted">
            {category.class || "Classe pendente"} ·{" "}
            {category.gender || "Gênero pendente"}
          </p>
        </div>
        <StatusBadge status={competition?.status ?? "DRAFT"} />
      </div>

      <dl className="t-review-grid">
        <div>
          <dt>Formato</dt>
          <dd>{competition ? formatLabels[competition.format] : "Pendente"}</dd>
        </div>
        <div>
          <dt>Ranking de duplas</dt>
          <dd>{competition?.rankingName ?? "Sem ranking"}</dd>
        </div>
        <div>
          <dt>Ranking Geral</dt>
          <dd>{competition?.feedsGeneralRanking ? "Ativo" : "Inativo"}</dd>
        </div>
        <div>
          <dt>Duplas e jogos</dt>
          <dd>
            {competition?.pairCount ?? 0} duplas ·{" "}
            {competition?.completedMatchCount ?? 0}/
            {competition?.matchCount ?? 0} jogos
          </dd>
        </div>
      </dl>

      <div className="section-actions">
        {nextStep ? (
          <Link href={nextStep.href} className="button button-primary">
            {nextStep.label}
          </Link>
        ) : (
          <span className="pill">Categoria concluída</span>
        )}
      </div>
    </article>
  );
}
