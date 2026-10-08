export function getPortalGreeting(date: Date, timeZone = "America/Sao_Paulo") {
  const hour = Number(new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(date));

  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}
