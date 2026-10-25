type Settings = { portalPaymentBankAccountId?: string | null; portalConsumptionEnabled?: boolean; portalPaymentsConfigured: boolean; portalPaymentEnabled: boolean; portalPixEnabled: boolean; portalCreditCardEnabled: boolean; checkoutExpiryMinutes: number };
export function portalCheckoutPolicy(settings: Settings | null) {
  const visible = settings?.portalConsumptionEnabled ?? true;
  // Creating printer preferences must not silently change existing payment flows.
  if (!settings?.portalPaymentsConfigured) return { configured: false, bankAccountId: null, visible, enabled: visible, pix: true, creditCard: true, expiryMinutes: 0 };
  return { configured: true, bankAccountId: settings.portalPaymentBankAccountId ?? null, visible, enabled: visible && settings.portalPaymentEnabled, pix: settings.portalPixEnabled, creditCard: settings.portalCreditCardEnabled, expiryMinutes: settings.checkoutExpiryMinutes };
}

export function portalExcludedPaymentTypes(methods: { pix: boolean; creditCard: boolean }) {
  if (!methods.pix && !methods.creditCard) throw new Error("Selecione Pix ou cartão de crédito.");
  return ["ticket", "atm", "debit_card", "prepaid_card", ...(!methods.pix ? ["bank_transfer"] : []), ...(!methods.creditCard ? ["credit_card"] : [])].map(id => ({ id }));
}
