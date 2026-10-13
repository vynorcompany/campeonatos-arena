// O Mercado Pago exige ao menos 30 minutos a partir da emissão do Pix.
// A margem de um minuto cobre o tempo entre montar a requisição e recebê-la.
export function pixPaymentExpiration(now = new Date(), requested?: Date) {
  const minimum = new Date(now.getTime() + 31 * 60_000);
  return requested && requested > minimum ? requested : minimum;
}
