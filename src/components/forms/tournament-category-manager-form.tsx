"use client";

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { updateTournamentAction, type ActionState } from "@/lib/actions/tournament";
import { parseCategoryListInput, TOURNAMENT_CATEGORY_PRESETS } from "@/lib/tournament-categories";
import { SubmitButton } from "@/components/forms/submit-button";

const initialState: ActionState = {
  error: null,
  success: null
};

type TournamentCategoryManagerFormProps = {
  tournamentId: string;
  defaultName: string;
  defaultDescription: string;
  defaultPublicSlug: string;
  defaultRegistrationPhase: string;
  defaultCreationMode: "MANUAL" | "PUBLIC";
  defaultGroupCount: number;
  defaultPairsPerGroup: number;
  defaultPriceFirstCents: number;
  defaultPriceSecondCents: number;
  defaultPriceThirdCents: number;
  defaultBlockCategoryGap: boolean;
  defaultMaxCategoryGap: number;
  defaultRankingId: string;
  defaultCategories: Array<{ name: string; priceSecondCents: number; priceThirdCents: number }>;
};

export function TournamentCategoryManagerForm(props: TournamentCategoryManagerFormProps) {
  const [state, formAction] = useFormState(updateTournamentAction, initialState);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    props.defaultCategories.length
      ? props.defaultCategories.map((category) => category.name)
      : parseCategoryListInput("")
  );
  const [priceByCategory, setPriceByCategory] = useState<Record<string, { second: string; third: string }>>(() =>
    Object.fromEntries(
      props.defaultCategories.map((category) => [
        category.name,
        {
          second: String(Math.round((category.priceSecondCents ?? 0) / 100)),
          third: String(Math.round((category.priceThirdCents ?? 0) / 100))
        }
      ])
    )
  );
  const [customCategory, setCustomCategory] = useState("");

  const categoryList = useMemo(
    () =>
      JSON.stringify(
        selectedCategories.map((name) => ({
          name,
          priceSecondCents: priceByCategory[name]?.second || "0",
          priceThirdCents: priceByCategory[name]?.third || "0"
        }))
      ),
    [selectedCategories, priceByCategory]
  );

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
    setPriceByCategory((current) => ({ ...current, [normalized]: current[normalized] ?? { second: "0", third: "0" } }));
    setSelectedCategories((current) => [...current, normalized]);
    setCustomCategory("");
  }

  function removeCategory(category: string) {
    setSelectedCategories((current) => current.filter((item) => item !== category));
  }

  function updateCategoryPrice(category: string, key: "second" | "third", value: string) {
    setPriceByCategory((current) => ({
      ...current,
      [category]: {
        second: current[category]?.second ?? "0",
        third: current[category]?.third ?? "0",
        [key]: value
      }
    }));
  }

  return (
    <form action={formAction} className="grid-form">
      <input type="hidden" name="tournamentId" value={props.tournamentId} />
      <input type="hidden" name="name" value={props.defaultName} />
      <input type="hidden" name="description" value={props.defaultDescription} />
      <input type="hidden" name="publicSlug" value={props.defaultPublicSlug} />
      <input type="hidden" name="creationMode" value={props.defaultCreationMode} />
      <input type="hidden" name="registrationPhase" value={props.defaultRegistrationPhase} />
      <input type="hidden" name="groupCount" value={String(props.defaultGroupCount)} />
      <input type="hidden" name="pairsPerGroup" value={String(props.defaultPairsPerGroup)} />
      <input type="hidden" name="priceFirstCents" value={String(Math.round(props.defaultPriceFirstCents / 100))} />
      <input type="hidden" name="priceSecondCents" value={String(Math.round(props.defaultPriceSecondCents / 100))} />
      <input type="hidden" name="priceThirdCents" value={String(Math.round(props.defaultPriceThirdCents / 100))} />
      <input type="hidden" name="maxCategoryGap" value={String(props.defaultMaxCategoryGap)} />
      <input type="hidden" name="rankingId" value={props.defaultRankingId} />
      <input type="hidden" name="categoryList" value={categoryList} />
      {props.defaultBlockCategoryGap ? <input type="hidden" name="blockCategoryGap" value="on" /> : null}

      <div className="field">
        <label>Categorias em ordem</label>
        <p className="muted">A ordem define o nível. Configure os adicionais da 2ª e da 3ª+ inscrição por categoria.</p>
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
              <div key={category} className="section-card" style={{ minWidth: "280px" }}>
                <strong>{category}</strong>
                <div className="field" style={{ marginTop: "8px" }}>
                  <label>Adicional 2ª inscrição</label>
                  <input
                    value={priceByCategory[category]?.second ?? "0"}
                    onChange={(event) => updateCategoryPrice(category, "second", event.target.value)}
                    placeholder="R$ 30"
                  />
                </div>
                <div className="field">
                  <label>Adicional 3ª inscrição+</label>
                  <input
                    value={priceByCategory[category]?.third ?? "0"}
                    onChange={(event) => updateCategoryPrice(category, "third", event.target.value)}
                    placeholder="R$ 20"
                  />
                </div>
                <button type="button" className="button" onClick={() => removeCategory(category)}>
                  Remover
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="field field-submit">
        <SubmitButton label="Salvar categorias" pendingLabel="Salvando..." className="button button-primary" />
      </div>

      {state?.error ? <p className="form-error form-full">{state.error}</p> : null}
      {state?.success ? <p className="form-success form-full">{state.success}</p> : null}
    </form>
  );
}
