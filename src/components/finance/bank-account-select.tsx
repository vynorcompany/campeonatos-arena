"use client";

import { sharedUtilities } from "@/components/ui/shared.utilities";

export function ReceivingBankAccountSelect({ accounts, defaultValue = "", value, onValueChange, className = sharedUtilities.field }: { accounts: { id: string; name: string }[]; defaultValue?: string; value?: string; onValueChange?: (value: string) => void; className?: string }) {
  return <label className={className}>Conta bancária<select name="bankAccountId" value={value} defaultValue={value === undefined ? defaultValue : undefined} onChange={event => onValueChange?.(event.target.value)} required><option value="">Selecione a conta bancária</option>{accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select>{!accounts.length ? <small>Cadastre uma conta bancária nas configurações financeiras.</small> : null}</label>;
}
