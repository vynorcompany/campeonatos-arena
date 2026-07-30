import { SubmitButton } from "@/components/forms/submit-button";
import { createCategoryCompetitionAction } from "@/lib/actions/category-competition";
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
