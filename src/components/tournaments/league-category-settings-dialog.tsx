"use client";
import { Modal } from "@/components/ui/modal";
import { MoneyInput, formatMoneyInput } from "@/components/forms/money-input";

import { viewStyles } from "./league-category-settings-dialog.utilities";

import { useCallback, useState } from "react";
import { updateLeagueCategoryAction } from "@/lib/actions/category-competition";
import { CATEGORY_CLASS_OPTIONS, CATEGORY_GENDER_OPTIONS } from "@/lib/tournament-category/options";

export function LeagueCategorySettingsDialog({ category }: { category: { id: string; name: string; class: string; gender: string; leagueTier: string; registrationFeeCents: number } }) {
  const [open, setOpen] = useState(false);
  const closeDialog = useCallback(() => setOpen(false), []);
  return <><button type="button" className={viewStyles.button_button_small_league_category_edit_trigger} onClick={() => setOpen(true)}>Editar Liga</button><Modal title="Editar Liga" open={open} onClose={closeDialog}><form action={updateLeagueCategoryAction} className={viewStyles.league_settings_dialog}><input type="hidden" name="categoryId" value={category.id} /><label className={viewStyles.field}>Nome da Liga<input name="name" defaultValue={category.name} required /></label><div className={viewStyles.league_settings_grid}><label className={viewStyles.field}>Classe<select name="class" defaultValue={category.class}>{CATEGORY_CLASS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className={viewStyles.field}>Gênero<select name="gender" defaultValue={category.gender}>{CATEGORY_GENDER_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className={viewStyles.field}>Nível da Liga<select name="leagueTier" defaultValue={category.leagueTier || "A"}><option value="A">Liga A</option><option value="B">Liga B</option></select></label><label className={viewStyles.field}>Valor da inscrição<MoneyInput name="registrationFee" defaultValue={formatMoneyInput(category.registrationFeeCents)} required /></label></div><footer><button type="button" className={viewStyles.button} onClick={() => setOpen(false)}>Cancelar</button><button className={viewStyles.button_button_primary} type="submit">Salvar alterações</button></footer></form></Modal></>;
}
