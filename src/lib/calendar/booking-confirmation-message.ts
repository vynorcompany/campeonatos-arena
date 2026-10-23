export function bookingConfirmationMessage({ template, clientName, arenaName, courtName, startsAt }: { template?: string; clientName: string; arenaName: string; courtName: string; startsAt: Date }) {
  const pad = (value: number) => String(value).padStart(2, "0");
  // Occurrence dates contain the arena wall time in the server-local representation.
  const values: Record<string, string> = { cliente: clientName, arena: arenaName, quadra: courtName, data: `${pad(startsAt.getDate())}/${pad(startsAt.getMonth() + 1)}/${startsAt.getFullYear()}`, horario: `${pad(startsAt.getHours())}:${pad(startsAt.getMinutes())}` };
  const text = template?.trim() || "Olá, {cliente}! Sua reserva na {arena}, {quadra}, foi confirmada para {data} às {horario}.";
  return text.replace(/\{(cliente|arena|quadra|data|horario)\}/g, (_, key: string) => values[key]);
}
