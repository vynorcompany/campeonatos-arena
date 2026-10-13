"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { cancelReviewedRegistrationAction, releaseReviewedCheckoutAction, releaseReviewedFinancialEntryAction } from "@/lib/actions/online-payment-review";

export function ReviewedCheckoutRelease({ recordId, kind, paymentId, clientName, canResolve }: { recordId: string; kind: "checkout" | "entry" | "registration"; paymentId: string; clientName: string; canResolve: boolean }) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback("");
    startTransition(async () => {
      try {
        const result = kind === "checkout" ? await releaseReviewedCheckoutAction(recordId, confirmed) : kind === "entry" ? await releaseReviewedFinancialEntryAction(recordId, paymentId, confirmed) : await cancelReviewedRegistrationAction(recordId, confirmed);
        setFeedback(result.ok ? kind === "registration" ? "Estorno confirmado. Inscrição cancelada; a dupla pode fazer uma nova inscrição." : "Estorno confirmado. Uma nova tentativa de pagamento está liberada." : result.error ?? "Não foi possível liberar o pagamento.");
        if (result.ok) router.refresh();
      } catch {
        setFeedback("Não foi possível validar sua permissão ou consultar este pagamento.");
      }
    });
  }

  return <article className="tw:grid tw:min-w-0 tw:gap-3 tw:rounded-xl tw:border tw:border-amber-200 tw:bg-amber-50 tw:p-4 tw:text-slate-800">
    <div className="tw:min-w-0 tw:text-sm"><strong className="tw:block tw:break-words">{clientName}</strong><span className="tw:block tw:break-all tw:text-xs tw:text-slate-600">Pagamento {paymentId || "sem identificador"} · {kind === "checkout" ? "Checkout" : kind === "entry" ? "Lançamento" : "Inscrição"} {recordId}</span></div>
    {canResolve ? <form className="tw:grid tw:gap-2" onSubmit={submit}>
      <label className="tw:flex tw:items-start tw:gap-2 tw:text-xs tw:leading-relaxed"><input className="tw:mt-0.5" type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} required />Confirmei no Mercado Pago que houve estorno integral ou cancelamento.</label>
      <button className="tw:min-h-9 tw:rounded-lg tw:bg-[#1d5d9f] tw:px-3 tw:py-2 tw:text-xs tw:font-semibold tw:text-white tw:disabled:opacity-50" type="submit" disabled={!confirmed || pending}>{pending ? "Conferindo no Mercado Pago..." : kind === "registration" ? "Conferir e cancelar inscrição" : "Conferir e liberar nova tentativa"}</button>
      {feedback ? <p role="status" className="tw:m-0 tw:text-xs tw:font-medium">{feedback}</p> : null}
    </form> : <p className="tw:m-0 tw:text-xs tw:text-slate-600">{kind === "registration" ? "Somente usuários com permissão de edição de torneios podem encerrar a inscrição após o estorno." : "Somente usuários com permissão de edição financeira podem liberar nova tentativa após o estorno."}</p>}
  </article>;
}
