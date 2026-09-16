"use client";

import { useMemo, useState } from "react";
import { useFormState } from "react-dom";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  updateTournamentAction,
  type ActionState,
} from "@/lib/actions/tournament";
import { TOURNAMENT_CATEGORY_PRESETS } from "@/lib/tournament-categories";

const initialState: ActionState = {
  error: null,
  success: null,
};

type ManagedCategory = {
  name: string;
  groupCount: number;
  pairsPerGroup: number;
  priceSecondCents: number;
  priceThirdCents: number;
  hasCompetition?: boolean;
  standardKey?: string;
  allowedRegistrationCategoryNames?: string[];
};

type TournamentCategoryManagerFormProps = {
  tournamentId: string;
  defaultName: string;
  defaultDescription: string;
  defaultPublicSlug: string;
  defaultRegistrationPhase: string;
  defaultShowInEventRadar?: boolean;
  defaultCreationMode: "MANUAL" | "PUBLIC";
  defaultGroupCount: number;
  defaultPairsPerGroup: number;
  defaultPriceFirstCents: number;
  defaultPriceSecondCents: number;
  defaultPriceThirdCents: number;
  defaultBlockCategoryGap: boolean;
  defaultMaxCategoryGap: number;
  defaultRankingId: string;
  defaultCategories: ManagedCategory[];
  compactMode?: boolean;
};

export function TournamentCategoryManagerForm(
  props: TournamentCategoryManagerFormProps,
) {
  const [state, formAction] = useFormState(
    updateTournamentAction,
    initialState,
  );
  const [categories, setCategories] = useState<ManagedCategory[]>(
    props.defaultCategories,
  );
  const [newCategoryName, setNewCategoryName] = useState("");

  const categoryList = useMemo(
    () =>
      JSON.stringify(
        categories.map((category) => ({
          name: category.name,
          groupCount: category.groupCount,
          pairsPerGroup: category.pairsPerGroup,
          priceSecondCents: Math.round(category.priceSecondCents / 100),
          priceThirdCents: Math.round(category.priceThirdCents / 100),
          standardKey: category.standardKey ?? "",
          allowedRegistrationCategoryNames: category.allowedRegistrationCategoryNames ?? [],
        })),
      ),
    [categories],
  );

  function addCategory() {
    const name = newCategoryName.trim();
    if (!name || categories.some((category) => category.name === name)) {
      return;
    }

    setCategories((current) => [
      ...current,
      {
        name,
        groupCount: props.defaultGroupCount,
        pairsPerGroup: props.defaultPairsPerGroup,
        priceSecondCents: props.defaultPriceSecondCents,
        priceThirdCents: props.defaultPriceThirdCents,
        standardKey: "",
        allowedRegistrationCategoryNames: [],
      },
    ]);
    setNewCategoryName("");
  }

  function removeCategory(name: string) {
    setCategories((current) =>
      current.filter(
        (category) => category.name !== name || category.hasCompetition,
      ),
    );
  }

  return (
    <form action={formAction} className="stack-sm">
      <input type="hidden" name="tournamentId" value={props.tournamentId} />
      <input type="hidden" name="name" value={props.defaultName} />
      <input
        type="hidden"
        name="description"
        value={props.defaultDescription}
      />
      <input type="hidden" name="publicSlug" value={props.defaultPublicSlug} />
      <input
        type="hidden"
        name="creationMode"
        value={props.defaultCreationMode}
      />
      <input
        type="hidden"
        name="registrationPhase"
        value={props.defaultRegistrationPhase}
      />
      {props.defaultShowInEventRadar ? <input type="hidden" name="showInEventRadar" value="on" /> : null}
      <input
        type="hidden"
        name="groupCount"
        value={String(props.defaultGroupCount)}
      />
      <input
        type="hidden"
        name="pairsPerGroup"
        value={String(props.defaultPairsPerGroup)}
      />
      <input
        type="hidden"
        name="priceFirstCents"
        value={String(Math.round(props.defaultPriceFirstCents / 100))}
      />
      <input
        type="hidden"
        name="priceSecondCents"
        value={String(Math.round(props.defaultPriceSecondCents / 100))}
      />
      <input
        type="hidden"
        name="priceThirdCents"
        value={String(Math.round(props.defaultPriceThirdCents / 100))}
      />
      <input
        type="hidden"
        name="maxCategoryGap"
        value={String(props.defaultMaxCategoryGap)}
      />
      <input type="hidden" name="rankingId" value={props.defaultRankingId} />
      <input type="hidden" name="categoryList" value={categoryList} />
      {props.defaultBlockCategoryGap ? (
        <input type="hidden" name="blockCategoryGap" value="on" />
      ) : null}

      <div className="field">
        <label htmlFor="newCategoryName">Nome da nova categoria</label>
        <div className="field-inline">
          <input
            id="newCategoryName"
            value={newCategoryName}
            onChange={(event) => setNewCategoryName(event.target.value)}
            placeholder="Ex.: 5ª Feminina"
          />
          <button type="button" className="button" onClick={addCategory}>
            Adicionar
          </button>
        </div>
      </div>

      {categories.length ? (
        <div className="simple-list">
          {categories.map((category, index) => (
            <div className="simple-item" key={category.name}>
              <div className="match-copy">
                <strong>
                  {index + 1}. {category.name}
                </strong>
                <span>
                  {category.hasCompetition
                    ? "Competição configurada"
                    : "Aguardando classe, gênero e formato"}
                </span>
                <label>Categoria padrão<select value={category.standardKey ?? ""} onChange={(event) => setCategories((current) => current.map((item) => item.name === category.name ? { ...item, standardKey: event.target.value } : item))}><option value="">Não vincular</option>{TOURNAMENT_CATEGORY_PRESETS.map((preset) => <option value={preset} key={preset}>{preset}</option>)}</select></label>
                <label><input type="checkbox" checked={(category.allowedRegistrationCategoryNames ?? []).length > 0} onChange={(event) => setCategories((current) => current.map((item) => item.name === category.name ? { ...item, allowedRegistrationCategoryNames: event.target.checked ? current.filter((candidate) => candidate.name !== item.name).map((candidate) => candidate.name) : [] } : item))} /> Vincular inscrição apenas às categorias marcadas</label>
                {(category.allowedRegistrationCategoryNames ?? []).length ? <div>{categories.filter((candidate) => candidate.name !== category.name).map((candidate) => <label key={candidate.name}><input type="checkbox" checked={category.allowedRegistrationCategoryNames?.includes(candidate.name)} onChange={(event) => setCategories((current) => current.map((item) => item.name === category.name ? { ...item, allowedRegistrationCategoryNames: event.target.checked ? [...(item.allowedRegistrationCategoryNames ?? []), candidate.name] : (item.allowedRegistrationCategoryNames ?? []).filter((name) => name !== candidate.name) } : item))} /> {candidate.name}</label>)}</div> : null}
              </div>
              {!category.hasCompetition ? (
                <button
                  type="button"
                  className="button"
                  onClick={() => removeCategory(category.name)}
                >
                  Remover
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">Adicione a primeira categoria do evento.</p>
      )}

      <div className="section-actions">
        <SubmitButton
          label="Salvar categorias"
          pendingLabel="Salvando..."
          className="button button-primary"
        />
      </div>

      {state?.error ? <p className="form-error">{state.error}</p> : null}
      {state?.success ? <p className="form-success">{state.success}</p> : null}
    </form>
  );
}
