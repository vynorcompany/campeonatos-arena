import { z } from "zod";

export type BookingParticipant = {
  playerId: string;
  amountCents: number;
  paymentMethod: string;
};

export function parseScheduledAt(value: string) {
  const scheduledAt = new Date(value);
  if (Number.isNaN(scheduledAt.getTime())) {
    throw new Error("Data e hora invalidas.");
  }
  return scheduledAt;
}

export function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function moneyToCents(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Informe um valor válido.");
  }
  return Math.round(parsed * 100);
}

export function parseCourtIds(value: string, fallbackCourtId: string) {
  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch {
    throw new Error("Quadras inválidas.");
  }

  const parsed = z.array(z.string().trim().min(1)).safeParse(raw);
  if (!parsed.success) {
    throw new Error("Quadras inválidas.");
  }
  return Array.from(new Set([fallbackCourtId, ...parsed.data]));
}

export function parseBookingParticipants(value: string): BookingParticipant[] {
  let raw: unknown;
  try {
    raw = JSON.parse(value);
  } catch {
    throw new Error("Participantes inválidos.");
  }

  const parsed = z.array(z.object({
    playerId: z.string().trim().min(1),
    amountCents: z.coerce.number().int().min(0),
    paymentMethod: z.string().trim().default("")
  })).safeParse(raw);
  if (!parsed.success) {
    throw new Error("Participantes inválidos.");
  }
  if (new Set(parsed.data.map((participant) => participant.playerId)).size !== parsed.data.length) {
    throw new Error("Cada atleta só pode participar uma vez.");
  }
  return parsed.data;
}
