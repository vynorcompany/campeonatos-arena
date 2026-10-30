type Settings = { portalPaymentBankAccountId?: string | null; portalConsumptionEnabled?: boolean; portalPaymentsConfigured: boolean; portalPaymentEnabled: boolean; portalPixEnabled: boolean; portalCreditCardEnabled: boolean; checkoutExpiryMinutes: number };
export function portalCheckoutPolicy(settings: Settings | null) {
  const visible = settings?.portalConsumptionEnabled ?? true;
  const bankAccountId = settings?.portalPaymentBankAccountId?.trim() || null;
  // A arena escolhe a conta de todos os novos checkouts antes de habilitar recebimentos.
  if (!settings?.portalPaymentsConfigured) return { configured: false, bankAccountId, visible, enabled: visible && Boolean(bankAccountId), pix: true, creditCard: true, expiryMinutes: 0 };
  return { configured: true, bankAccountId, visible, enabled: visible && settings.portalPaymentEnabled && Boolean(bankAccountId), pix: settings.portalPixEnabled, creditCard: settings.portalCreditCardEnabled, expiryMinutes: settings.checkoutExpiryMinutes };
}

export function portalExcludedPaymentTypes(methods: { pix: boolean; creditCard: boolean }) {
  if (!methods.pix && !methods.creditCard) throw new Error("Selecione Pix ou cartão de crédito.");
  return ["ticket", "atm", "debit_card", "prepaid_card", ...(!methods.pix ? ["bank_transfer"] : []), ...(!methods.creditCard ? ["credit_card"] : [])].map(id => ({ id }));
}
