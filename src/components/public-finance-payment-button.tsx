"use client";

import { useState, useTransition } from "react";
import { startPublicFinancialEntryPaymentAction } from "@/lib/actions/public-finance-payment";

export function PublicFinancePaymentButton({ arenaSlug, entryId, paymentUrl }: { arenaSlug: string; entryId: string; paymentUrl?: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const pay = () => {
    setMessage("");
    if (paymentUrl) {
      window.location.assign(paymentUrl);
      return;
    }
    startTransition(async () => {
      try {
        const data = new FormData();
        data.set("arenaSlug", arenaSlug);
        data.set("entryId", entryId);
        const result = await startPublicFinancialEntryPaymentAction(data);
        window.location.assign(result.checkoutUrl);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Não foi possível abrir o pagamento.");
      }
    });
  };
  return <span className="public-finance-payment-action"><button type="button" className="button button-primary button-small" onClick={pay} disabled={pending}>{pending ? "Abrindo..." : "Pagar agora"}</button>{message ? <small role="alert">{message}</small> : null}</span>;
}
