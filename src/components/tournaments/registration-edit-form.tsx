"use client";

import { useActionState, useState, type ReactNode } from "react";
import { MoneyInput } from "@/components/forms/money-input";
import { ReceivingBankAccountSelect } from "@/components/finance/bank-account-select";
import { updateTournamentRegistrationAction, type ActionState } from "@/lib/actions/tournament";

const initialState: ActionState = { error: null, success: null };

export function RegistrationEditForm({ children, className }: { children: ReactNode; className?: string }) {
  const [state, action] = useActionState(updateTournamentRegistrationAction, initialState);

  return <form action={action} className={className}>
    {children}
    {state.error ? <p role="alert" className="tw:col-span-full tw:m-0 tw:rounded-lg tw:bg-red-50 tw:p-3 tw:text-sm tw:text-red-800">{state.error}</p> : null}
    {state.success ? <p role="status" className="tw:col-span-full tw:m-0 tw:rounded-lg tw:bg-emerald-50 tw:p-3 tw:text-sm tw:text-emerald-800">{state.success}</p> : null}
  </form>;
}

export function RegistrationPaymentFields({ amountCents: initialAmount, accounts }: { amountCents: number; accounts: { id: string; name: string }[] }) {
  const [amountCents, setAmountCents] = useState(initialAmount);
  const [paymentStatus, setPaymentStatus] = useState("PENDING");
  return <>
    <label>Valor (R$)<MoneyInput name="amountReais" valueCents={amountCents} onValueCentsChange={setAmountCents} required /></label>
    <label>Status<select name="paymentStatus" value={paymentStatus} onChange={event => setPaymentStatus(event.target.value)}><option value="PENDING">Pagamento pendente</option><option value="PAID">Pago / confirmar</option></select></label>
    {paymentStatus === "PAID" && amountCents > 0 ? <ReceivingBankAccountSelect accounts={accounts} className="tw:grid tw:min-w-0 tw:content-start tw:gap-1.5" /> : null}
  </>;
}
