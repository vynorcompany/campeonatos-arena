"use client";
import { viewStyles } from "./category-competition-form.utilities";

import { useRef } from "react";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  createCategoryCompetitionAction,
  updateCategoryPublicVisibilityAction,
} from "@/lib/actions/category-competition";
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
    <form action={createCategoryCompetitionAction} className={viewStyles.grid_form}>
      <input type="hidden" name="categoryId" value={categoryId} />

      <div className={viewStyles.field_form_full}>
        <strong>Configurar {categoryName}</strong>
        <p className={viewStyles.muted}>
          Classe, gênero e formato ficam congelados depois que a competição é
          criada.
        </p>
      </div>

      <div className={viewStyles.field}>
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

      <div className={viewStyles.field}>
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

      <div className={viewStyles.field}>
        <label htmlFor={`format-${categoryId}`}>Formato</label>
        <select id={`format-${categoryId}`} name="format" defaultValue="LEAGUE">
          <option value="LEAGUE">Liga</option>
          <option value="THREE_GROUPS">3 grupos</option>
          <option value="FOUR_GROUPS">4 grupos</option>
          <option value="SIMPLE">Simples (grupos de 3 e 4)</option>
        </select>
      </div>

      <div className={viewStyles.field}>
        <label htmlFor={`league-tier-${categoryId}`}>Nível da Liga</label>
        <select id={`league-tier-${categoryId}`} name="leagueTier" defaultValue="A">
          <option value="A">Liga A</option>
          <option value="B">Liga B</option>
        </select>
      </div>

      <div className={viewStyles.field}>
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

      <p className={viewStyles.muted_form_full}>
        O Ranking Geral será alimentado conforme a configuração do ranking selecionado.
      </p>

      <label className={viewStyles.field_form_full_2}>
        <input type="checkbox" name="isPublic" />
        <span>Exibir na página pública</span>
      </label>

      <div className={viewStyles.field_field_submit_form_full}>
        <SubmitButton
          label="Criar competição da categoria"
          pendingLabel="Criando..."
          className={viewStyles.button_button_primary}
        />
      </div>
    </form>
  );
}

export function CategoryPublicVisibilityForm({
  competitionId,
  isPublic,
}: {
  competitionId: string;
  isPublic: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form
      action={updateCategoryPublicVisibilityAction}
      className={viewStyles.public_visibility_switch}
      ref={formRef}
    >
      <input type="hidden" name="competitionId" value={competitionId} />
      <label>
        <input
          type="checkbox"
          name="isPublic"
          defaultChecked={isPublic}
          onChange={() => formRef.current?.requestSubmit()}
        />
        <span aria-hidden="true" />
        Exibir no App
      </label>
      <button className={viewStyles.sr_only} type="submit" tabIndex={-1}>Salvar visibilidade</button>
    </form>
  );
}
