"use client";

import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { updateAthletePortalSettingsAction } from "@/lib/actions/arena";

type Settings = { showLeagues: boolean; showBooking: boolean; showReservations: boolean; showLessons: boolean; showClasses: boolean; showDoublesRadar: boolean; portalLogoUrl: string };
type SettingKey = Exclude<keyof Settings, "portalLogoUrl">;

export function AthletePortalSettingsForm({ settings }: { settings: Settings }) {
  const items: Array<[SettingKey, string, string]> = [
    ["showLeagues", "Torneios", "Jogos, duplas, ranking, regras e premiação."],
    ["showBooking", "Grade de horários", "Reservas online pela grade de quadras."],
    ["showReservations", "Minhas reservas", "Reservas futuras do atleta."],
    ["showLessons", "Aulas", "Aulas vinculadas ao atleta."],
    ["showClasses", "Turmas", "Turmas disponíveis por professor."],
    ["showDoublesRadar", "Radar de duplas", "Atletas disponíveis para torneios e busca por parceiro."],
  ];
  const fieldNames: Record<SettingKey, string> = { showLeagues: "showLeagues", showBooking: "showBooking", showReservations: "showReservations", showLessons: "showLessons", showClasses: "showClasses", showDoublesRadar: "showDoublesRadar" };
  return <SafeActionForm action={updateAthletePortalSettingsAction} className="athlete-portal-settings-form" successMessage="Configurações do Portal do Atleta atualizadas."><label className="athlete-portal-logo-upload"><span>Logo do Portal do Atleta</span><input name="athletePortalLogo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" /><small>Use uma imagem horizontal transparente, na proporção 6:1. Recomendado: 504 × 84 px; ela aparece em 168 × 28 px no celular.</small>{settings.portalLogoUrl ? <em>Logo personalizada ativa. Envie outro arquivo apenas se quiser substituir.</em> : <em>Sem logo específico: o Portal usa a logo geral da arena.</em>}</label><div className="athlete-portal-settings-list">{items.map(([key, label, detail]) => <label className="control-toggle athlete-portal-setting" key={key}><input name={fieldNames[key]} type="checkbox" defaultChecked={settings[key]} /><span aria-hidden="true" /><div><strong>{label}</strong><em>{detail}</em></div></label>)}</div><p className="form-note">Meu perfil permanece sempre disponível para o atleta.</p><SubmitButton label="Salvar Portal" pendingLabel="Salvando..." className="button button-primary" /></SafeActionForm>;
}
