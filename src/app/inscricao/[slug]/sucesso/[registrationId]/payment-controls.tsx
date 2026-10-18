"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { viewStyles } from "./page.utilities";

export function RegistrationPaymentControls({ holdExpiresAt, checkoutUrl, qrCode, qrCodeBase64 }: {
  holdExpiresAt: string | null;
  checkoutUrl: string;
  qrCode: string;
  qrCodeBase64: string;
}) {
  const router = useRouter();
  const [now, setNow] = useState<number | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const refreshedAtExpiry = useRef(false);
  const deadline = holdExpiresAt ? Date.parse(holdExpiresAt) : null;
  const expired = deadline !== null && now !== null && now >= deadline;
  const remainingSeconds = deadline !== null && now !== null ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null;

  useEffect(() => {
    if (deadline === null || !Number.isFinite(deadline)) return;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current >= deadline && !refreshedAtExpiry.current) {
        refreshedAtExpiry.current = true;
        router.refresh();
      }
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [deadline, router]);

  const copyCode = async () => {
    try {
      if (!navigator.clipboard) throw new Error("Área de transferência indisponível.");
      await navigator.clipboard.writeText(qrCode);
      setCopyStatus("Código Pix copiado.");
    } catch {
      setCopyStatus("Selecione e copie o código exibido acima.");
    }
  };

  return <div className={viewStyles.payment_controls}>
    {deadline !== null ? <p className={viewStyles.payment_deadline} role="status">
      {expired ? "O prazo desta vaga terminou. Não pague esta cobrança." : remainingSeconds === null ? "Vaga reservada por até 1 hora." : `Tempo restante para pagar: ${Math.floor(remainingSeconds / 60)}min ${String(remainingSeconds % 60).padStart(2, "0")}s`}
    </p> : null}
    {!expired && (qrCodeBase64 || qrCode) ? <div className={viewStyles.pix_payment}>
      <strong>Pague com Pix</strong>
      {qrCodeBase64 ? <img src={`data:image/png;base64,${qrCodeBase64}`} alt="QR Code para pagamento da inscrição por Pix" /> : null}
      {qrCode ? <div><span>Pix copia e cola</span><code>{qrCode}</code><button type="button" className={viewStyles.payment_copy_button} onClick={copyCode}>Copiar código Pix</button>{copyStatus ? <small role="status">{copyStatus}</small> : null}</div> : null}
    </div> : null}
    {!expired && checkoutUrl ? <a className={viewStyles.button_button_primary} href={checkoutUrl} target="_blank" rel="noreferrer">Pagar agora</a> : null}
    <button type="button" className={viewStyles.payment_refresh_button} onClick={() => router.refresh()}>Atualizar situação</button>
  </div>;
}
