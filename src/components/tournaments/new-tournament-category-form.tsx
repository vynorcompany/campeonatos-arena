"use client";
import { useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { createTournamentCategoryAction } from "@/lib/actions/tournament";
import { CATEGORY_CLASS_OPTIONS, CATEGORY_GENDER_OPTIONS } from "@/lib/tournament-category/options";
import { tournamentWorkspace as ui } from "./tournament-workspace";

export function NewTournamentCategoryForm({ tournamentId }: { tournamentId: string }) {
 const [registrationType, setRegistrationType] = useState("PAIR");
 return <SafeActionForm action={createTournamentCategoryAction} className="tw:grid tw:min-w-0 tw:max-w-[760px] tw:grid-cols-2 tw:gap-4 tw:viewport-620:grid-cols-1" successMessage="Categoria criada.">
  <input type="hidden" name="tournamentId" value={tournamentId}/>
  <label className={ui.field + " tw:col-span-full"}>Nome da categoria<input name="name" placeholder="Ex.: 5ª Feminina" autoFocus required/></label>
  <label className={ui.field + " tw:col-span-full tw:max-w-[360px]"}>Tipo de inscrição<select name="registrationType" value={registrationType} onChange={event=>setRegistrationType(event.target.value)}><option value="PAIR">Dupla · dois atletas</option><option value="TRIO">Trio · três atletas</option><option value="INDIVIDUAL">Individual · um atleta, sem jogos</option></select></label>
  {registrationType === "TRIO" ? <><label className={ui.field}>Classe<select name="class" required defaultValue=""><option value="">Selecione</option>{CATEGORY_CLASS_OPTIONS.map(item=><option key={item} value={item}>{item}</option>)}</select></label><label className={ui.field}>Gênero<select name="gender" required defaultValue=""><option value="">Selecione</option>{CATEGORY_GENDER_OPTIONS.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="tw:col-span-full tw:flex tw:items-center tw:gap-2 tw:text-xs tw:text-[#354f70]"><input type="checkbox" name="isPublic" defaultChecked className="tw:size-4! tw:min-h-0! tw:w-4! tw:shrink-0"/>Exibir na página pública</label></> : null}
  {registrationType === "INDIVIDUAL" ? <p className="tw:col-span-full tw:m-0 tw:text-xs tw:text-[#465c75]">Um atleta por inscrição, sem gestão de jogos.</p> : null}
  <footer className="tw:col-span-full tw:flex tw:justify-end tw:border-t tw:border-[#c7d8eb] tw:pt-3"><SubmitButton label="Criar e configurar categoria" pendingLabel="Criando..." className={ui.success}/></footer>
 </SafeActionForm>;
}
