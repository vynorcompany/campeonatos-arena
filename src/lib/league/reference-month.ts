const arenaTimeZone = "America/Sao_Paulo";

export function leagueReferenceMonth(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: arenaTimeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  if (!year || !month) throw new Error("Não foi possível determinar o mês da Liga.");
  return `${year}-${month}`;
}
