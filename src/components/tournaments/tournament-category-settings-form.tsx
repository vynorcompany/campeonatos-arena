"use client";

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
    <form action={updateTournamentCategorySettingsAction} className="tournament-category-detail-form">
      <input type="hidden" name="categoryId" value={category.id} />
      <header>
        <p className="eyebrow">Inscrições da categoria</p>
        <h2>Configurar {category.name}</h2>
        <p>Defina vagas, valores e as categorias padrão permitidas para o mesmo atleta.</p>
      </header>
      <div className="tournament-category-detail-grid">
        <label>Limite máximo de duplas<input name="maxRegistrations" type="number" min="0" step="1" defaultValue={category.maxRegistrations} required /><small>Use 0 para vagas ilimitadas.</small></label>
        <label>Valor por dupla (R$)<input name="priceFirst" type="number" min="0" step="0.01" defaultValue={(category.priceFirstCents / 100).toFixed(2)} required /></label>
        <label>Valor da 2ª inscrição (R$)<input name="priceSecond" type="number" min="0" step="0.01" defaultValue={(category.priceSecondCents / 100).toFixed(2)} required /></label>
        <label>Valor da 3ª inscrição (R$)<input name="priceThird" type="number" min="0" step="0.01" defaultValue={(category.priceThirdCents / 100).toFixed(2)} required /></label>
      </div>
      <section className="tournament-category-restrictions">
        <div><strong>Impedimentos de inscrição</strong><p>Um atleta nesta categoria só poderá ter inscrição simultânea nas categorias padrão marcadas.</p></div>
        {standardCategories.length ? <div className="tournament-category-standard-options">{standardCategories.map((item) => <label key={item.id}><input name="allowedStandardKey" type="checkbox" value={item.standardKey} defaultChecked={selectedIds.has(item.id)} /> {item.standardKey}</label>)}</div> : <p className="muted">Cadastre categorias padrão nas demais categorias para configurar impedimentos.</p>}
      </section>
      <label className="tournament-category-active-toggle"><input name="active" type="checkbox" defaultChecked={category.active} /><span>Categoria ativa para novas inscrições</span></label>
      <div><SubmitButton label="Salvar configurações" pendingLabel="Salvando..." className="button button-primary" /></div>
    </form>
  );
}
