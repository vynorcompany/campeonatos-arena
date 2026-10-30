"use client";

import { useState } from "react";
import { CurrencyInput } from "@/components/forms/currency-input";
import { ReceivingBankAccountSelect } from "@/components/finance/bank-account-select";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { ToggleSwitch } from "@/components/forms/toggle-switch";

export function LessonPaymentFields({ accounts }: { accounts: { id: string; name: string }[] }) {
  const [paid, setPaid] = useState(false);
  return <>
    <div className="tw:col-span-full"><input type="hidden" name="isPaid" value={paid ? "on" : ""} /><ToggleSwitch compact label="Aula paga" checked={paid} onCheckedChange={setPaid} /></div>
    {paid ? <>
      <label className={ui.field}>Valor da aula<CurrencyInput name="price" required /></label>
      <label className={ui.field}>Pagamento<select name="paymentMethod" defaultValue="PIX"><option value="PIX">Pix</option><option value="CREDIT_CARD">Cartão de crédito</option><option value="DEBIT_CARD">Cartão de débito</option><option value="CASH">Dinheiro</option><option value="OTHER">Outro</option></select></label>
      <ReceivingBankAccountSelect accounts={accounts} className={ui.field} />
    </> : null}
  </>;
}
