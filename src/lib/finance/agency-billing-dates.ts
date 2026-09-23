const timeZone = "America/Sao_Paulo";

function localParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute"), second: value("second") };
}

function offsetMinutes(date: Date) {
  const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" }).formatToParts(date).find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(name);
  if (!match) return 0;
  const minutes = Number(match[2]) * 60 + Number(match[3] ?? 0);
  return match[1] === "-" ? -minutes : minutes;
}

export function agencyBillingDay(date: Date) {
  return localParts(date).day;
}

export function agencyInvoicePeriod(date: Date) {
  const { year, month } = localParts(date);
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function nextAgencyDueDate(date: Date, billingDay: number) {
  if (!Number.isInteger(billingDay) || billingDay < 1 || billingDay > 31) throw new Error("Dia de cobrança inválido.");
  const local = localParts(date);
  const firstNextMonth = new Date(Date.UTC(local.year, local.month, 1));
  const year = firstNextMonth.getUTCFullYear();
  const month = firstNextMonth.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const target = Date.UTC(year, month, Math.min(billingDay, lastDay), local.hour, local.minute, local.second, date.getUTCMilliseconds());
  return new Date(target - offsetMinutes(new Date(target)) * 60_000);
}
