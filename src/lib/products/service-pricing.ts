/** Round once, in cents, for the full rental interval. */
export function servicePriceCents(priceCents: number, hourly: boolean, durationMinutes = 60): number {
  if (!Number.isSafeInteger(priceCents) || priceCents < 0 || !Number.isSafeInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) throw new Error("Valor ou duração do serviço inválidos.");
  const total = hourly ? Math.round(priceCents * durationMinutes / 60) : priceCents;
  if (!Number.isSafeInteger(total) || total > 2_147_483_647) throw new Error("Valor do serviço acima do limite permitido.");
  return total;
}
