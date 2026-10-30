"use client";
import { viewStyles } from "./tournament-category-settings-form.utilities";

import { MoneyInput, formatMoneyInput } from "@/components/forms/money-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { updateTournamentCategorySettingsAction } from "@/lib/actions/category-competition";

type StandardCategory = { id: string; name: string; standardKey: string };

export function TournamentCategorySettingsForm({
  category,
  standardCategories,
}: {
  category: {
    id: string;
    name: string;
    maxRegistrations: number;
    priceFirstCents: number;
    priceSecondCents: number;
    priceThirdCents: number;
    active: boolean;
    allowedRegistrationCategoryIds: string[];
  };
  standardCategories: StandardCategory[];
}) {
  const selectedIds = new Set(category.allowedRegistrationCategoryIds);
  return (
    <form action={updateTournamentCategorySettingsAction} className={viewStyles.tournament_category_detail_form}>
      <input type="hidden" name="categoryId" value={category.id} />
      <header>
        <h2>Configurar {category.name}</h2>
      </header>
      <div className={viewStyles.tournament_category_detail_grid}>
        <label>Limite máximo de duplas<input name="maxRegistrations" type="number" min="0" step="1" defaultValue={category.maxRegistrations} required /><small>Use 0 para vagas ilimitadas.</small></label>
        <label>Valor por dupla (R$)<MoneyInput name="priceFirst" defaultValue={formatMoneyInput(category.priceFirstCents)} required /></label>
        <label>Valor da 2ª inscrição (R$)<MoneyInput name="priceSecond" defaultValue={formatMoneyInput(category.priceSecondCents)} required /></label>
        <label>Valor da 3ª inscrição (R$)<MoneyInput name="priceThird" defaultValue={formatMoneyInput(category.priceThirdCents)} required /></label>
      </div>
      <section className={viewStyles.tournament_category_restrictions}>
        <div><strong>Impedimentos de inscrição</strong><p>Um atleta nesta categoria só poderá ter inscrição simultânea nas categorias padrão marcadas.</p></div>
        {standardCategories.length ? <div className={viewStyles.tournament_category_standard_options}>{standardCategories.map((item) => <label key={item.id}><input name="allowedStandardKey" type="checkbox" value={item.standardKey} defaultChecked={selectedIds.has(item.id)} /> {item.standardKey}</label>)}</div> : <p className={viewStyles.muted}>Cadastre categorias padrão nas demais categorias para configurar impedimentos.</p>}
      </section>
      <label className={viewStyles.tournament_category_active_toggle}><input name="active" type="checkbox" defaultChecked={category.active} /><span>Categoria ativa para novas inscrições</span></label>
      <div><SubmitButton label="Salvar configurações" pendingLabel="Salvando..." className={viewStyles.button_button_primary} /></div>
    </form>
  );
}
