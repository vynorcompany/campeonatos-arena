"use client";

import { useEffect, useState } from "react";

export function AgencyBillingNotice({ invoiceId, daysRemaining }: { invoiceId: string; daysRemaining: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const key = `arena:billing-alert:${invoiceId}:${daysRemaining}`;
    if (window.sessionStorage.getItem(key)) return;
    window.sessionStorage.setItem(key, "1");
    setVisible(true);
  }, [invoiceId, daysRemaining]);
  return visible ? <div className="agency-billing-toast" role="alertdialog" aria-label="Aviso de fatura do sistema"><strong>Fatura do sistema em atraso</strong><span>{daysRemaining ? `O acesso poderá ser suspenso em ${daysRemaining} dia${daysRemaining === 1 ? "" : "s"}.` : "O prazo para pagamento termina hoje."}</span><button type="button" onClick={() => setVisible(false)} aria-label="Fechar aviso">×</button></div> : null;
}
