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
  priceFirstCents: number;
  priceSecondCents: number;
  priceThirdCents: number;
  hasCompetition?: boolean;
  standardKey?: string;
  allowedRegistrationStandardKeys?: string[];
  maxRegistrations?: number;
  active?: boolean;
};

type TournamentCategoryManagerFormProps = {
  tournamentId: string;
  defaultName: string;
  defaultDescription: string;
  defaultResponsibleName: string;
  defaultResponsiblePhone: string;
  defaultStartsAt?: string;
  defaultEndsAt?: string;
  defaultRegistrationOpensAt?: string;
  defaultRegistrationClosesAt?: string;
  defaultEarlyDiscountCents?: number;
  defaultEarlyDiscountUntil?: string;
  defaultFirstBonusLimit?: number;
  defaultFirstBonusUntil?: string;
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
          priceFirstCents: Math.round(category.priceFirstCents / 100),
          priceSecondCents: Math.round(category.priceSecondCents / 100),
          priceThirdCents: Math.round(category.priceThirdCents / 100),
          standardKey: category.standardKey ?? "",
          allowedRegistrationStandardKeys: category.allowedRegistrationStandardKeys ?? [],
          maxRegistrations: category.maxRegistrations ?? 0,
          active: category.active !== false,
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
        priceFirstCents: props.defaultPriceFirstCents,
        priceSecondCents: props.defaultPriceSecondCents,
        priceThirdCents: props.defaultPriceThirdCents,
        standardKey: "",
        allowedRegistrationStandardKeys: [],
        maxRegistrations: 0,
        active: true,
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
      <input type="hidden" name="responsibleName" value={props.defaultResponsibleName} />
      <input type="hidden" name="responsiblePhone" value={props.defaultResponsiblePhone} />
      <input type="hidden" name="startsAt" value={props.defaultStartsAt ?? ""} />
      <input type="hidden" name="endsAt" value={props.defaultEndsAt ?? ""} />
      <input type="hidden" name="registrationOpensAt" value={props.defaultRegistrationOpensAt ?? ""} />
      <input type="hidden" name="registrationClosesAt" value={props.defaultRegistrationClosesAt ?? ""} />
      <input type="hidden" name="earlyDiscountReais" value={String((props.defaultEarlyDiscountCents ?? 0) / 100)} />
      <input type="hidden" name="earlyDiscountUntil" value={props.defaultEarlyDiscountUntil ?? ""} />
      <input type="hidden" name="firstBonusLimit" value={String(props.defaultFirstBonusLimit ?? 0)} />
      <input type="hidden" name="firstBonusUntil" value={props.defaultFirstBonusUntil ?? ""} />
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

      <div className="field tournament-category-add-field">
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
        <div className="tournament-category-manager-list">
          {categories.map((category, index) => (
            <article className="tournament-category-manager-card" key={category.name}>
              <div className="tournament-category-manager-card-header">
                <div>
                  <strong>{index + 1}. {category.name}</strong>
                  <span>
                  {category.hasCompetition
                    ? "Competição configurada"
                    : "Aguardando classe, gênero e formato"}
                  </span>
                </div>
                {!category.hasCompetition ? <button type="button" className="button button-small" onClick={() => removeCategory(category.name)}>Remover</button> : null}
              </div>
              <div className="tournament-category-settings-grid">
                <label className="tournament-category-standard">Categoria padrão<select value={category.standardKey ?? ""} onChange={(event) => setCategories((current) => current.map((item) => item.name === category.name ? { ...item, standardKey: event.target.value, allowedRegistrationStandardKeys: [] } : item))}><option value="">Selecione</option>{TOURNAMENT_CATEGORY_PRESETS.map((preset) => <option value={preset} key={preset}>{preset}</option>)}</select></label>
                <label className="tournament-category-standard">Limite máximo de duplas inscritas<input type="number" min="0" step="1" value={category.maxRegistrations ?? 0} onChange={(event) => setCategories((current) => current.map((item) => item.name === category.name ? { ...item, maxRegistrations: Math.max(0, Number(event.target.value) || 0) } : item))} /><small>Use 0 para não limitar inscrições.</small></label>
                <label className="tournament-category-standard">Valor por dupla<div className="currency-input"><span>R$</span><input inputMode="decimal" value={(category.priceFirstCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} onChange={(event) => setCategories((current) => current.map((item) => item.name === category.name ? { ...item, priceFirstCents: Math.round(Math.max(0, Number(event.target.value.replace(".", "").replace(",", ".")) || 0) * 100) } : item))} /></div></label>
                <label className="tournament-category-standard">Valor da 2ª inscrição<div className="currency-input"><span>R$</span><input inputMode="decimal" value={(category.priceSecondCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} onChange={(event) => setCategories((current) => current.map((item) => item.name === category.name ? { ...item, priceSecondCents: Math.round(Math.max(0, Number(event.target.value.replace(".", "").replace(",", ".")) || 0) * 100) } : item))} /></div></label>
                <label className="tournament-category-standard">Valor da 3ª inscrição<div className="currency-input"><span>R$</span><input inputMode="decimal" value={(category.priceThirdCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} onChange={(event) => setCategories((current) => current.map((item) => item.name === category.name ? { ...item, priceThirdCents: Math.round(Math.max(0, Number(event.target.value.replace(".", "").replace(",", ".")) || 0) * 100) } : item))} /></div></label>
                <label className="tournament-category-link-toggle"><input type="checkbox" checked={category.active !== false} onChange={(event) => setCategories((current) => current.map((item) => item.name === category.name ? { ...item, active: event.target.checked } : item))} /><span>Categoria ativa</span></label>
              </div>
              {(() => {
                const candidates = categories.filter((candidate) => candidate.name !== category.name && candidate.standardKey && candidate.standardKey !== category.standardKey);
                const allowedKeys = category.allowedRegistrationStandardKeys ?? [];
                return <>
                  <label className="tournament-category-link-toggle"><input type="checkbox" disabled={!category.standardKey || !candidates.length} checked={allowedKeys.length > 0} onChange={(event) => setCategories((current) => current.map((item) => item.name === category.name ? { ...item, allowedRegistrationStandardKeys: event.target.checked ? candidates.map((candidate) => candidate.standardKey ?? "").filter(Boolean) : [] } : item))} /><span>Vincular inscrição apenas às categorias padrão marcadas</span></label>
                  {!category.standardKey ? <small className="muted">Selecione a categoria padrão antes de definir os vínculos.</small> : null}
                  {category.standardKey && !candidates.length ? <small className="muted">Defina categorias padrão nas demais categorias para criar vínculos.</small> : null}
                  {allowedKeys.length ? <div className="tournament-category-link-options">{candidates.map((candidate) => <label key={candidate.name}><input type="checkbox" checked={allowedKeys.includes(candidate.standardKey ?? "")} onChange={(event) => setCategories((current) => current.map((item) => item.name === category.name ? { ...item, allowedRegistrationStandardKeys: event.target.checked ? [...new Set([...(item.allowedRegistrationStandardKeys ?? []), candidate.standardKey ?? ""])].filter(Boolean) : (item.allowedRegistrationStandardKeys ?? []).filter((key) => key !== candidate.standardKey) } : item))} /> {candidate.standardKey}</label>)}</div> : null}
                </>;
              })()}
            </article>
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
