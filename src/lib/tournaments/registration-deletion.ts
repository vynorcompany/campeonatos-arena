type DeletableRegistration = {
  status: string;
  paymentStatus: string;
  paymentProvider: string;
  paymentReference: string;
  mercadoPagoPaymentId: string;
  paymentCheckoutUrl: string;
};

// A cobrança online pode ser criada antes de recebermos seu identificador.
// Somente inscrições manuais ainda não pagas podem ser excluídas sem perder
// o vínculo necessário para conciliar um retorno tardio do provedor.
export function canDeleteTournamentRegistration(registration: DeletableRegistration) {
  return registration.status === "PENDING_PAYMENT"
    && registration.paymentStatus === "PENDING"
    && registration.paymentProvider === "MANUAL"
    && !registration.paymentReference
    && !registration.mercadoPagoPaymentId
    && !registration.paymentCheckoutUrl;
}

export function canEditManualTournamentRegistration(registration: DeletableRegistration) {
  return registration.status === "PENDING_PAYMENT"
    && registration.paymentStatus === "PENDING"
    && registration.paymentProvider === "MANUAL"
    && !registration.paymentReference
    && !registration.mercadoPagoPaymentId
    && !registration.paymentCheckoutUrl;
}
