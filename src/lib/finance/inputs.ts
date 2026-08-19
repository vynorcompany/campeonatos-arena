export function parseMoneyToCents(value: string) {
  const cleanValue = value.trim() || "0";
  const normalized = cleanValue.replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Valor inválido.");
  }

  return Math.round(amount * 100);
}

export function parseDate(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getReferenceMonthRange(referenceMonth: string) {
  const [yearValue, monthValue] = referenceMonth.split("-").map(Number);
  const year = Number.isFinite(yearValue) ? yearValue : new Date().getFullYear();
  const monthIndex = Number.isFinite(monthValue) ? monthValue - 1 : new Date().getMonth();

  return {
    start: new Date(year, monthIndex, 1),
    end: new Date(year, monthIndex + 1, 1),
    dueDate: new Date(year, monthIndex + 1, 0)
  };
}
