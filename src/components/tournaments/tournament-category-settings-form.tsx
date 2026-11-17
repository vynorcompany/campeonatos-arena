"use client";
import { useState } from "react";
import { MoneyInput, formatMoneyInput } from "@/components/forms/money-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { updateTournamentCategorySettingsAction } from "@/lib/actions/category-competition";
import { EventEditorSection } from "./event-editor-section";
import { tournamentWorkspace as ui } from "./tournament-workspace";

type StandardCategory = { id: string; name: string; standardKey: string };
export function TournamentCategorySettingsForm({ category, standardCategories }: {
 category: { id: string; name: string; registrationType?: string; registrationTypeLocked?: boolean; maxRegistrations: number; priceFirstCents: number; priceSecondCents: number; priceThirdCents: number; active: boolean; allowedRegistrationCategoryIds: string[] };
 standardCategories: StandardCategory[];
}) {
 const [registrationType, setRegistrationType] = useState(category.registrationType ?? "PAIR");
 const selectedIds = new Set(category.allowedRegistrationCategoryIds);
 return <form action={updateTournamentCategorySettingsAction} className="tw:grid tw:w-full tw:min-w-0 tw:gap-4">
  <input type="hidden" name="categoryId" value={category.id}/>
  <EventEditorSection title="Inscrição da categoria"><div className="tw:grid tw:min-w-0 tw:grid-cols-2 tw:gap-3 tw:viewport-620:grid-cols-1">
   <label className={ui.field}>Tipo de inscrição<select name="registrationType" value={registrationType} onChange={event => setRegistrationType(event.target.value)} disabled={category.registrationTypeLocked}><option value="PAIR">Dupla · dois atletas</option><option value="INDIVIDUAL">Individual · um atleta, sem jogos</option></select></label>
   {category.registrationTypeLocked ? <input type="hidden" name="registrationType" value={category.registrationType ?? "PAIR"}/> : null}
   <label className={ui.field}>Limite máximo de inscrições<input name="maxRegistrations" type="number" min="0" step="1" defaultValue={category.maxRegistrations} required/><small>Use 0 para vagas ilimitadas.</small></label>
  </div>{registrationType === "INDIVIDUAL" ? <p className="tw:m-0 tw:text-xs tw:text-[#174983]">Um atleta por inscrição. Esta categoria não terá grupos, chaveamento ou gestão de jogos.</p> : null}
  {category.registrationTypeLocked ? <p className="tw:m-0 tw:text-xs tw:text-[#465c75]">O tipo de inscrição fica protegido quando já existem inscrições ou competição.</p> : null}
  <label className="tw:flex tw:items-center tw:gap-2 tw:text-xs"><input name="active" type="checkbox" defaultChecked={category.active}/>Categoria ativa para novas inscrições</label></EventEditorSection>
  <EventEditorSection title="Valores de inscrição"><div className="tw:grid tw:min-w-0 tw:grid-cols-3 tw:gap-3 tw:viewport-620:grid-cols-1">
   <label className={ui.field}>1ª inscrição por atleta (R$)<MoneyInput smart name="priceFirst" defaultValue={formatMoneyInput(category.priceFirstCents)} required/></label>
   <label className={ui.field}>2ª inscrição por atleta (R$)<MoneyInput smart name="priceSecond" defaultValue={formatMoneyInput(category.priceSecondCents)} required/></label>
   <label className={ui.field}>3ª inscrição por atleta (R$)<MoneyInput smart name="priceThird" defaultValue={formatMoneyInput(category.priceThirdCents)} required/></label>
  </div></EventEditorSection>
  <EventEditorSection title="Regras entre categorias"><p className="tw:m-0 tw:text-xs tw:text-[#465c75]">Um atleta nesta categoria só poderá se inscrever simultaneamente nas categorias padrão marcadas.</p>
  {standardCategories.length ? <div className="tw:flex tw:min-w-0 tw:flex-wrap tw:gap-3">{standardCategories.map(item => <label key={item.id} className="tw:flex tw:items-center tw:gap-2 tw:text-xs"><input name="allowedStandardKey" type="checkbox" value={item.standardKey} defaultChecked={selectedIds.has(item.id)}/>{item.standardKey}</label>)}</div> : <p className="tw:m-0 tw:text-xs tw:text-[#465c75]">Cadastre categorias padrão nas demais categorias para configurar impedimentos.</p>}</EventEditorSection>
  <footer className="tw:flex tw:justify-end tw:border-t tw:border-[#c7d8eb] tw:pt-3"><SubmitButton label="Salvar configurações" pendingLabel="Salvando..." className={ui.success}/></footer>
 </form>;
}
