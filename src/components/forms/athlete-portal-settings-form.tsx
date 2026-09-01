"use client";

import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { updateAthletePortalSettingsAction } from "@/lib/actions/arena";

type Settings = { showLeagues: boolean; showBooking: boolean; showReservations: boolean; showLessons: boolean; showClasses: boolean };

export function AthletePortalSettingsForm({ settings }: { settings: Settings }) {
  const items: Array<[keyof Settings, string, string]> = [
    ["showLeagues", "Ligas", "Jogos, duplas, ranking, regras e premiação."],
    ["showBooking", "Grade de horários", "Reservas online pela grade de quadras."],
    ["showReservations", "Minhas reservas", "Reservas futuras do atleta."],
    ["showLessons", "Aulas", "Aulas vinculadas ao atleta."],
    ["showClasses", "Turmas", "Turmas disponíveis por professor."],
  ];
  const fieldNames: Record<keyof Settings, string> = { showLeagues: "showLeagues", showBooking: "showBooking", showReservations: "showReservations", showLessons: "showLessons", showClasses: "showClasses" };
  return <SafeActionForm action={updateAthletePortalSettingsAction} className="athlete-portal-settings-form" successMessage="Menus do Portal do Atleta atualizados."><div className="athlete-portal-settings-list">{items.map(([key, label, detail]) => <label className="control-toggle athlete-portal-setting" key={key}><input name={fieldNames[key]} type="checkbox" defaultChecked={settings[key]} /><span aria-hidden="true" /><div><strong>{label}</strong><em>{detail}</em></div></label>)}</div><p className="form-note">Meu perfil permanece sempre disponível para o atleta.</p><SubmitButton label="Salvar menus" pendingLabel="Salvando..." className="button button-primary" /></SafeActionForm>;
}
