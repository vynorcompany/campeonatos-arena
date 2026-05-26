"use client";

import { useFormState } from "react-dom";
import { useMemo, useState } from "react";
import { SubmitButton } from "@/components/forms/submit-button";
import { createTournamentAction, type ActionState, updateTournamentAction } from "@/lib/actions/tournament";
import { parseCategoryListInput, TOURNAMENT_CATEGORY_PRESETS } from "@/lib/tournament-categories";

const initialState: ActionState = {
  error: null,
  success: null
};

type TournamentFormProps = {
  mode?: "create" | "update";
  tournamentId?: string;
  defaultName?: string;
  defaultDescription?: string;
  defaultPublicSlug?: string;
  defaultRegistrationPhase?: string;
  defaultGroupCount?: number;
  defaultPairsPerGroup?: number;
  defaultPriceFirstCents?: number;
  defaultPriceSecondCents?: number;
  defaultPriceThirdCents?: number;
  defaultBlockCategoryGap?: boolean;
  defaultMaxCategoryGap?: number;
  defaultCategoryList?: string;
  defaultRankingId?: string;
  rankings?: { id: string; name: string }[];
  submitLabel?: string;
  pendingLabel?: string;
};

export function TournamentForm({
  mode = "create",
  tournamentId,
  defaultName = "",
  defaultDescription = "",
  defaultPublicSlug = "",
  defaultRegistrationPhase = "REGISTRATIONS",
  defaultGroupCount = 4,
  defaultPairsPerGroup = 3,
  defaultPriceFirstCents = 7000,
  defaultPriceSecondCents = 10000,
  defaultPriceThirdCents = 15000,
  defaultBlockCategoryGap = true,
  defaultMaxCategoryGap = 1,
  defaultCategoryList = "1,2,3,4",
  defaultRankingId = "",
  rankings = [],
  submitLabel = "Criar torneio",
  pendingLabel = "Criando..."
}: TournamentFormProps) {
  const action = mode === "update" ? updateTournamentAction : createTournamentAction;
  const [state, formAction] = useFormState(action, initialState);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(parseCategoryListInput(defaultCategoryList));
  const [customCategory, setCustomCategory] = useState("");
  const defaultPriceFirstReais = String(Math.round(defaultPriceFirstCents / 100));
  const defaultPriceSecondReais = String(Math.round(defaultPriceSecondCents / 100));
  const defaultPriceThirdReais = String(Math.round(defaultPriceThirdCents / 100));
  const categoryList = useMemo(() => selectedCategories.join(","), [selectedCategories]);

  function toggleCategory(category: string) {
    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category]
    );
  }

  function addCustomCategory() {
    const normalized = customCategory.trim();
    if (!normalized) return;
    if (selectedCategories.includes(normalized)) {
      setCustomCategory("");
      return;
    }
    setSelectedCategories((current) => [...current, normalized]);
    setCustomCategory("");
  }

  function removeCategory(category: string) {
    setSelectedCategories((current) => current.filter((item) => item !== category));
  }

  return (
    <form action={formAction} className="grid-form">
      {mode === "update" && tournamentId ? <input type="hidden" name="tournamentId" value={tournamentId} /> : null}

      <div className="field">
        <label htmlFor="name">Nome do torneio</label>
        <input id="name" name="name" type="text" placeholder="Ex.: Liga Interna de Abril" defaultValue={defaultName} required />
      </div>
      <div className="field">
        <label htmlFor="description">Descrição e regras da inscrição</label>
        <textarea id="description" name="description" placeholder="Regras, horários, premiação e observações." defaultValue={defaultDescription} rows={4} />
      </div>
      <div className="field">
        <label htmlFor="publicSlug">Link público da inscrição</label>
        <input id="publicSlug" name="publicSlug" type="text" placeholder="ex.: super12-junho-2026" defaultValue={defaultPublicSlug} required />
      </div>
      <div className="field">
        <label htmlFor="registrationPhase">Fase do torneio</label>
        <select id="registrationPhase" name="registrationPhase" defaultValue={defaultRegistrationPhase}>
          <option value="REGISTRATIONS">Inscrições</option>
          <option value="EDITING">Editando</option>
          <option value="LIVE">Acontecendo</option>
          <option value="FINISHED">Finalizado</option>
        </select>
      </div>

      <input type="hidden" id="groupCount" name="groupCount" value={String(defaultGroupCount)} />
      <input type="hidden" id="pairsPerGroup" name="pairsPerGroup" value={String(defaultPairsPerGroup)} />
      <div className="field">
        <label htmlFor="priceFirstCents">Valor 1ª inscrição</label>
        <input id="priceFirstCents" name="priceFirstCents" defaultValue={defaultPriceFirstReais} placeholder="R$ 70" required />
      </div>
      <div className="field">
        <label htmlFor="priceSecondCents">Valor 2ª inscrição</label>
        <input id="priceSecondCents" name="priceSecondCents" defaultValue={defaultPriceSecondReais} placeholder="R$ 100" required />
      </div>
      <div className="field">
        <label htmlFor="priceThirdCents">Valor 3ª inscrição+</label>
        <input id="priceThirdCents" name="priceThirdCents" defaultValue={defaultPriceThirdReais} placeholder="R$ 150" required />
      </div>
      <div className="field">
        <label htmlFor="maxCategoryGap">Diferença máxima de nível entre categorias</label>
        <select id="maxCategoryGap" name="maxCategoryGap" defaultValue={String(defaultMaxCategoryGap)}>
          <option value="1">1 nível</option>
          <option value="2">2 níveis</option>
          <option value="3">3 níveis</option>
          <option value="4">4 níveis</option>
          <option value="5">5 níveis</option>
        </select>
      </div>
      <div className="field">
        <label>Categorias em ordem</label>
        <div className="stack-xs">
          <div className="simple-grid simple-grid-2">
            {TOURNAMENT_CATEGORY_PRESETS.map((category) => (
              <label key={category} className="category-option">
                <input type="checkbox" checked={selectedCategories.includes(category)} onChange={() => toggleCategory(category)} />
                <span>{category}</span>
              </label>
            ))}
          </div>
          <div className="field-inline">
            <input
              value={customCategory}
              onChange={(event) => setCustomCategory(event.target.value)}
              placeholder="Adicionar categoria personalizada"
            />
            <button type="button" className="button" onClick={addCustomCategory}>Adicionar</button>
          </div>
          <div className="field-inline" style={{ flexWrap: "wrap", gap: "8px" }}>
            {selectedCategories.map((category) => (
              <button key={category} type="button" className="button" onClick={() => removeCategory(category)}>
                {category} ×
              </button>
            ))}
          </div>
        </div>
        <input type="hidden" name="categoryList" value={categoryList} />
      </div>
      <div className="field field-inline">
        <input id="blockCategoryGap" name="blockCategoryGap" type="checkbox" defaultChecked={defaultBlockCategoryGap} />
        <label htmlFor="blockCategoryGap">Ativar impedimento por gap de categoria</label>
      </div>

      <div className="field">
        <label htmlFor="rankingId">Ranking usado no torneio</label>
        <select id="rankingId" name="rankingId" defaultValue={defaultRankingId}>
          <option value="">Nenhum ranking vinculado</option>
          {rankings.map((ranking) => (
            <option key={ranking.id} value={ranking.id}>
              {ranking.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field field-submit">
        <label className="sr-only" htmlFor="submit-tournament">
          {submitLabel}
        </label>
        <SubmitButton label={submitLabel} pendingLabel={pendingLabel} className="button button-primary" />
      </div>

      {state?.error ? <p className="form-error form-full">{state.error}</p> : null}
      {state?.success ? <p className="form-success form-full">{state.success}</p> : null}
    </form>
  );
}

