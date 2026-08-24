"use client";

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
  whatsappMessage: string;
};

export function OnlineBookingSettingsDialog({ settings }: { settings: OnlineBookingSettings }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const publicPath = `/reservar/${settings.arenaSlug}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}${publicPath}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return <>
    <button type="button" className="agenda-online-settings-trigger" onClick={() => setOpen(true)} aria-label="Configurações do agendamento online" title="Configurações do agendamento online">⚙</button>
    {open ? <div className="command-modal-backdrop" role="presentation" onMouseDown={() => setOpen(false)}>
      <section className="online-booking-settings-modal" role="dialog" aria-modal="true" aria-label="Configurações do agendamento online" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><span>AGENDAMENTO ONLINE</span><h2>Configurações</h2></div><button type="button" className="button button-small" onClick={() => setOpen(false)}>Fechar</button></header>
        <div className="online-booking-link"><div><strong>Link da página pública</strong><code>{publicPath}</code></div><button type="button" className="button button-small" onClick={copyLink}>{copied ? "Link copiado" : "Copiar link"}</button></div>
        <SafeActionForm action={updateOnlineBookingSettingsAction} className="online-booking-settings-form" successMessage="Configurações do agendamento online salvas.">
          <label className="field">Disposição dos horários<select name="layout" defaultValue={settings.layout}><option value="BLOCKS">Blocos</option><option value="LIST">Lista</option></select></label>
          <label className="control-toggle"><input name="requiresConfirmation" type="checkbox" defaultChecked={settings.requiresConfirmation} /><span aria-hidden="true" /><em>Confirmação de reserva</em></label>
          <label className="control-toggle"><input name="showReserved" type="checkbox" defaultChecked={settings.showReserved} /><span aria-hidden="true" /><em>Mostrar horários reservados</em></label>
          <label className="control-toggle"><input name="paymentOnlineEnabled" type="checkbox" defaultChecked={settings.paymentOnlineEnabled} /><span aria-hidden="true" /><em>Pagamento online</em></label>
          <label className="field form-full">Mensagem de WhatsApp<textarea name="whatsappMessage" defaultValue={settings.whatsappMessage} placeholder="Ex.: Olá, {cliente}! Sua reserva foi recebida para {data} às {horario}." /></label>
          <p className="form-note form-full">As combinações de duração e o intervalo de cada quadra são definidos individualmente na configuração da agenda.</p>
          <div className="online-booking-settings-footer form-full"><a className="button" href="/agenda/configuracao">Configurar combinações por quadra</a><SubmitButton label="Salvar configurações" pendingLabel="Salvando..." className="button button-primary" /></div>
        </SafeActionForm>
      </section>
    </div> : null}
  </>;
}
