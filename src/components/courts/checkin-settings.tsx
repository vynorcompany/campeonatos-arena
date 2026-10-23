import QRCode from "qrcode";
import { env } from "@/lib/env";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { configureCourtCheckinAction } from "@/lib/actions/checkin";

export async function CheckinSettings({ arenaSlug, enabled, token }: { arenaSlug: string; enabled: boolean; token: string | null }) {
  const url = enabled && token ? new URL(`/checkin/${encodeURIComponent(arenaSlug)}?token=${encodeURIComponent(token)}`, env.appUrl).toString() : null;
  const qr = url ? await QRCode.toDataURL(url, { width: 320, margin: 3, errorCorrectionLevel: "M" }) : null;
  const button = "tw:rounded-lg tw:border tw:border-[#cbd9e7] tw:bg-white tw:px-4 tw:py-2.5 tw:text-sm tw:font-semibold tw:text-[#132d58]";
  return <details id="checkin" open className="tw:rounded-xl tw:border tw:border-[#dce7f2] tw:bg-white tw:p-4">
    <summary className="tw:cursor-pointer tw:text-sm tw:font-semibold tw:text-[#132d58]">Check-in nas quadras · {enabled ? "Ativado" : "Desativado"}</summary>
    <div className="tw:mt-4 tw:grid tw:min-w-0 tw:gap-4 tw:md:grid-cols-[200px_minmax(0,1fr)]">
      {qr ? <a href={qr} download="checkin-arena.png" aria-label="Baixar QR Code de check-in"><img src={qr} alt="QR Code para check-in nas quadras" width={200} height={200} className="tw:h-auto tw:max-w-full tw:rounded-lg" /></a> : null}
      <div className="tw:grid tw:min-w-0 tw:content-start tw:gap-3"><p className="tw:m-0 tw:text-sm tw:text-[#607898]">Disponibilize este QR Code na recepção. O atleta entra com seu cadastro no clube e confirma a quadra e o horário. A presença fica registrada para consulta e eventual cobrança.</p>
        {url ? <><a href={url} target="_blank" rel="noopener noreferrer" className="tw:break-all tw:text-xs tw:text-[#0868e5]">Abrir página de check-in</a><span className="tw:text-xs tw:text-[#607898]">Clique no QR Code para baixar a imagem.</span></> : null}
        <div className="tw:flex tw:flex-wrap tw:gap-3"><SafeActionForm action={configureCourtCheckinAction} successMessage={enabled ? "Check-in desativado." : "Check-in ativado."}><input type="hidden" name="enabled" value={String(!enabled)} /><SubmitButton label={enabled ? "Desativar check-in" : "Ativar e gerar QR Code"} pendingLabel="Salvando..." className={button} /></SafeActionForm>
          {enabled ? <SafeActionForm action={configureCourtCheckinAction} confirmKeyword="ALTERAR" confirmPrompt="Gerar outro QR Code? O código anterior deixará de funcionar." successMessage="Novo QR Code gerado. Substitua a imagem disponibilizada na arena."><input type="hidden" name="enabled" value="true" /><input type="hidden" name="rotate" value="true" /><SubmitButton label="Renovar QR Code" pendingLabel="Gerando..." className={button} /></SafeActionForm> : null}
        </div>
      </div>
    </div>
  </details>;
}
