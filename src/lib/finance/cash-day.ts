/** Chave da operação diária pelo calendário da arena, armazenada à meia-noite UTC. */
export function cashReferenceDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return new Date(`${value("year")}-${value("month")}-${value("day")}T00:00:00.000Z`);
}

export function cashReferencePeriod(start: Date, end: Date) {
  return { gte: cashReferenceDate(start), lte: cashReferenceDate(end) };
}

export function formatCashReferenceDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(value);
}

export function parseCashAmountCents(value: string) {
  const normalized = value.trim().replace(/^R\$\s*/, "");
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(normalized)) {
    throw new Error("Informe um valor monetário válido.");
  }
  const amountCents = Math.round(Number(normalized.replace(/\./g, "").replace(",", ".")) * 100);
  if (!Number.isSafeInteger(amountCents) || amountCents > 2_147_483_647) {
    throw new Error("Informe um valor monetário válido.");
  }
  return amountCents;
}
