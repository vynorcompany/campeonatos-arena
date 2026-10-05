"use client";
import { viewStyles } from "./online-booking-settings-dialog.utilities";

import { useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { updateOnlineBookingSettingsAction } from "@/lib/actions/calendar";

type OnlineBookingSettings = {
  arenaSlug: string;
  layout: string;
  requiresConfirmation: boolean;
  showReserved: boolean;
  paymentOnlineEnabled: boolean;
  enabled: boolean;
  leadTimeMinutes: number;
  whatsappMessage: string;
  whatsappConfirmationEnabled: boolean;
};

export function OnlineBookingSettingsDialog({ settings }: { settings: OnlineBookingSettings }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const publicPath = `/classificacao/${settings.arenaSlug}?section=booking`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}${publicPath}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return <>
    <button type="button" className={viewStyles.agenda_online_settings_trigger} onClick={() => setOpen(true)} aria-label="Configurações do agendamento online" title="Configurações do agendamento online">⚙</button>
    {open ? <div className={viewStyles.command_modal_backdrop} role="presentation" onMouseDown={() => setOpen(false)}>
      <section className={viewStyles.online_booking_settings_modal} role="dialog" aria-modal="true" aria-label="Configurações do agendamento online" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><span>AGENDAMENTO ONLINE</span><h2>Configurações</h2></div><button type="button" className={viewStyles.button_button_small} onClick={() => setOpen(false)}>Fechar</button></header>
        <div className={viewStyles.online_booking_link}><div><strong>Link do Portal do Atleta</strong><code>{publicPath}</code></div><button type="button" className={viewStyles.button_button_small} onClick={copyLink}>{copied ? "Link copiado" : "Copiar link"}</button></div>
        <SafeActionForm action={updateOnlineBookingSettingsAction} className={viewStyles.online_booking_settings_form} successMessage="Configurações do agendamento online salvas.">
          <label className={viewStyles.field}>Disposição dos horários<select name="layout" defaultValue={settings.layout}><option value="BLOCKS">Blocos</option><option value="LIST">Lista</option></select></label>
          <label className={viewStyles.field}>Prazo mínimo para agendamento<input name="leadTimeMinutes" type="number" min="0" max="10080" step="15" defaultValue={settings.leadTimeMinutes} /><small>Em minutos antes do horário escolhido.</small></label>
          <div className={viewStyles.online_booking_settings_toggles_form_full}>
            <label className={viewStyles.control_toggle}><input name="onlineBookingEnabled" type="checkbox" defaultChecked={settings.enabled} /><span aria-hidden="true" /><em>Reserva online disponível</em></label>
            <label className={viewStyles.control_toggle}><input name="requiresConfirmation" type="checkbox" defaultChecked={settings.requiresConfirmation} /><span aria-hidden="true" /><em>Confirmação de reserva</em></label>
            <label className={viewStyles.control_toggle}><input name="showReserved" type="checkbox" defaultChecked={settings.showReserved} /><span aria-hidden="true" /><em>Mostrar horários reservados</em></label>
            <label className={viewStyles.control_toggle}><input name="paymentOnlineEnabled" type="checkbox" defaultChecked={settings.paymentOnlineEnabled} /><span aria-hidden="true" /><em>Pagamento online</em></label>
            <label className={viewStyles.control_toggle}><input name="whatsappConfirmationEnabled" type="checkbox" defaultChecked={settings.whatsappConfirmationEnabled} /><span aria-hidden="true" /><em>Enviar confirmação pelo WhatsApp</em></label>
          </div>
          <label className={viewStyles.field_form_full}>Mensagem de WhatsApp<textarea name="whatsappMessage" defaultValue={settings.whatsappMessage} placeholder="Ex.: Olá, {cliente}! Sua reserva foi recebida para {data} às {horario}." /></label>
          <div className={viewStyles.online_booking_settings_footer_form_full}><SubmitButton label="Salvar configurações" pendingLabel="Salvando..." className={viewStyles.button_button_primary} /></div>
        </SafeActionForm>
      </section>
    </div> : null}
  </>;
}
