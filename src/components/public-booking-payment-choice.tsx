"use client";

import { useState, useTransition } from "react";
import { startPublicCourtBookingPaymentAction } from "@/lib/actions/calendar";

type Method = "PIX" | "CARD" | "BOLETO";
const options: Array<{ method: Method; title: string; detail: string }> = [{ method: "PIX", title: "Pix", detail: "Pague na hora pelo app do seu banco." }, { method: "CARD", title: "Cartão", detail: "Crédito ou débito, com parcelamento quando disponível." }, { method: "BOLETO", title: "Boleto", detail: "Emita o boleto para pagar até o vencimento." }];

export function PublicBookingPaymentChoice({ arenaSlug, occurrenceId }: { arenaSlug: string; occurrenceId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  function choose(method: Method) { setMessage(""); startTransition(async () => { try { const formData = new FormData(); formData.set("arenaSlug", arenaSlug); formData.set("occurrenceId", occurrenceId); formData.set("method", method); const result = await startPublicCourtBookingPaymentAction(formData); window.location.assign(result.checkoutUrl); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível abrir o pagamento."); } }); }
  return <main className="public-booking-payment-page"><section className="public-booking-payment-choice"><header><span>RESERVA ONLINE</span><h1>Como você prefere pagar?</h1><p>Escolha uma forma de pagamento para concluir sua reserva.</p></header><div className="public-booking-payment-options">{options.map((option) => <button key={option.method} type="button" disabled={pending} onClick={() => choose(option.method)}><span><strong>{option.title}</strong><small>{option.detail}</small></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></button>)}</div><p className="public-booking-payment-note">A reserva será confirmada somente após a aprovação do pagamento.</p>{message ? <p className="public-booking-message" role="alert">{message}</p> : null}</section></main>;
}
