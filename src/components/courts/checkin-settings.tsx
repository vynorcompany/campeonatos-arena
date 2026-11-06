import { LessonCheckinPolicyForm } from "@/components/courts/lesson-checkin-policy-form";
import QRCode from "qrcode";
import { env } from "@/lib/env";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { configureCourtCheckinAction } from "@/lib/actions/checkin";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";

export async function CheckinSettings({ arenaSlug, enabled, token, mode = "SELF", blockOverdueLessons = false }: { arenaSlug: string; enabled: boolean; token: string | null; mode?: string; blockOverdueLessons?: boolean }) {
  const url = enabled && token ? new URL(`/checkin/${encodeURIComponent(arenaSlug)}?token=${encodeURIComponent(token)}`, env.appUrl).toString() : null;
  const qr = url ? await QRCode.toDataURL(url, { width: 320, margin: 3, errorCorrectionLevel: "M" }) : null;
  return <section id="checkin" className="tw:grid tw:min-w-0 tw:gap-4">
    <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-3 tw:border-b tw:border-[var(--line)] tw:pb-3">
      <span className={`tw:inline-flex tw:items-center tw:gap-2 tw:rounded-md tw:px-2.5 tw:py-1.5 tw:text-xs ${enabled ? "tw:bg-[#e8f5ed] tw:text-[#11643c]" : "tw:bg-[#f1f4f8] tw:text-[#42536a]"}`}><span aria-hidden="true" className={`tw:size-1.5 tw:rounded-full ${enabled ? "tw:bg-[#16834e]" : "tw:bg-[#697b8d]"}`} />{enabled ? "Check-in ativado" : "Check-in desativado"}</span>
      <SafeActionForm action={configureCourtCheckinAction} successMessage={enabled ? "Check-in desativado." : "Check-in ativado."}>
        <input type="hidden" name="enabled" value={String(!enabled)} />
        <SubmitButton label={enabled ? "Desativar check-in" : "Ativar check-in"} pendingLabel="Salvando…" className={`${ui.primary} tw:font-normal ${enabled ? "tw:border-[#b42318]! tw:bg-[#b42318]! tw:text-white! tw:hover:bg-[#8e1b13]!" : "tw:border-[#087443]! tw:bg-[#087443]! tw:text-white! tw:hover:bg-[#065b35]!"}`} />
      </SafeActionForm>
    </div>
    <div className="tw:grid tw:min-w-0 tw:items-start tw:gap-4 tw:lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className={`${ui.panel} tw:grid tw:justify-items-center tw:gap-3 tw:bg-[#f5f8fc] tw:p-4 tw:text-center`}>
        {qr ? <>
          <a href={qr} download="checkin-arena.png" aria-label="Baixar QR Code de check-in" className="tw:block tw:w-full tw:max-w-[220px] tw:rounded-md tw:border tw:border-[var(--line)] tw:bg-white tw:focus-visible:outline-2 tw:focus-visible:outline-offset-4 tw:focus-visible:outline-[#215da5]"><img src={qr} alt="QR Code para check-in de quadras e aulas" width={320} height={320} className="tw:block tw:h-auto tw:w-full tw:rounded-md" /></a>
          <p className="tw:m-0 tw:text-xs tw:leading-relaxed tw:text-[#42536a]">Disponibilize na recepção para o atleta confirmar sua presença.</p>
          <div className="tw:flex tw:flex-wrap tw:justify-center tw:gap-2">
            <a href={url!} target="_blank" rel="noopener noreferrer" className={`${ui.primary} tw:font-normal`}>Abrir check-in ↗</a>
            <a href={qr} download="checkin-arena.png" className={`${ui.secondary} tw:border-[#215da5]! tw:text-[#174983]! tw:font-normal`}>Baixar QR Code</a>
          </div>
          <SafeActionForm action={configureCourtCheckinAction} confirmKeyword="ALTERAR" confirmPrompt="Gerar outro QR Code? O código anterior deixará de funcionar." successMessage="Novo QR Code gerado. Substitua a imagem disponibilizada na arena.">
            <input type="hidden" name="enabled" value="true" /><input type="hidden" name="rotate" value="true" />
            <SubmitButton label="Renovar QR Code" pendingLabel="Gerando…" className={`${ui.secondary} tw:border-[#215da5]! tw:text-[#174983]! tw:font-normal`} />
          </SafeActionForm>
        </> : <p className="tw:m-0 tw:py-6 tw:text-sm tw:leading-relaxed tw:text-[#42536a]">Ative o check-in para gerar o QR Code da arena.</p>}
      </aside>
      <div className="tw:grid tw:min-w-0 tw:gap-4">
        <SafeActionForm action={configureCourtCheckinAction} successMessage="Modo de check-in atualizado." className={`${ui.panel} tw:grid tw:min-w-0 tw:gap-3 tw:p-4`}>
          <input type="hidden" name="enabled" value={String(enabled)} />
          <label className={`${ui.field} tw:max-w-md`}>Check-in das reservas de quadra<select name="checkinMode" defaultValue={mode} className="tw:w-full tw:min-w-0"><option value="SELF">Cada atleta</option><option value="GROUP">Um atleta pelo grupo</option></select></label>
          <p className="tw:m-0 tw:text-xs tw:leading-relaxed tw:text-[#42536a]">No modo em grupo, um atleta vinculado confirma quem está presente. Nas aulas, o check-in é individual.</p>
          <div className="tw:border-t tw:border-[var(--line)] tw:pt-3"><SubmitButton label="Salvar modo de check-in" pendingLabel="Salvando…" className={`${ui.primary} tw:font-normal`} /></div>
        </SafeActionForm>
        <LessonCheckinPolicyForm enabled={blockOverdueLessons} />
      </div>
    </div>
  </section>;
}
