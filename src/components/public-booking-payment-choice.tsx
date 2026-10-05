"use client";
import { viewStyles } from "./public-booking-payment-choice.utilities";

import { useState, useTransition } from "react";
import { startPublicCourtBookingPaymentAction } from "@/lib/actions/calendar";

type Method = "PIX" | "CARD" | "BOLETO";
const options: Array<{ method: Method; title: string; detail: string }> = [{ method: "PIX", title: "Pix", detail: "Pague na hora pelo app do seu banco." }, { method: "CARD", title: "Cartão", detail: "Crédito ou débito, com parcelamento quando disponível." }, { method: "BOLETO", title: "Boleto", detail: "Emita o boleto para pagar até o vencimento." }];

type BookingSummary = { court: string; dateTime: string; duration: number; amountCents: number };

export function PublicBookingPaymentChoice({ arenaSlug, occurrenceId, summary }: { arenaSlug: string; occurrenceId: string; summary: BookingSummary }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  function choose(method: Method) { setMessage(""); startTransition(async () => { try { const formData = new FormData(); formData.set("arenaSlug", arenaSlug); formData.set("occurrenceId", occurrenceId); formData.set("method", method); const result = await startPublicCourtBookingPaymentAction(formData); window.location.assign(result.checkoutUrl); } catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível abrir o pagamento."); } }); }
  const durationLabel = summary.duration >= 60 ? `${Math.floor(summary.duration / 60)}h${summary.duration % 60 ? `${String(summary.duration % 60).padStart(2, "0")}` : ""}` : `${summary.duration} min`;
  const amountLabel = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(summary.amountCents / 100);
  return <main className={viewStyles.public_booking_payment_page}><section className={viewStyles.public_booking_payment_choice}><header><span>RESERVA ONLINE</span><h1>Como você prefere pagar?</h1><p>Escolha uma forma de pagamento para concluir sua reserva.</p></header><div className={viewStyles.public_booking_payment_summary}><span>Resumo da reserva</span><div><p><strong>{summary.court}</strong><small>{summary.dateTime} · {durationLabel}</small></p><p><small>Valor total</small><strong>{amountLabel}</strong></p></div></div><div className={viewStyles.public_booking_payment_options}>{options.map((option) => <button key={option.method} type="button" disabled={pending} onClick={() => choose(option.method)}><span><strong>{option.title}</strong><small>{option.detail}</small></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></button>)}</div><p className={viewStyles.public_booking_payment_note}>A reserva será confirmada somente após a aprovação do pagamento.</p>{message ? <p className={viewStyles.public_booking_message} role="alert">{message}</p> : null}</section></main>;
}
