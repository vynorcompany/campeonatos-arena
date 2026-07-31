import { z } from "zod";

const cpfSchema = z.string().trim().regex(/^\d{11}$/, "CPF deve ter 11 dígitos numéricos.");
const phoneSchema = z.string().trim().min(8, "Informe um telefone válido.");

export const createPlayerSchema = z.object({
  name: z.string().trim().min(3, "Informe ao menos 3 caracteres."),
  points: z.coerce.number().int().min(0, "A pontuação deve ser positiva."),
  phone: phoneSchema,
  cpf: cpfSchema,
  birthDate: z.coerce.date()
});

export const updatePlayerSchema = z.object({
  playerId: z.string().min(1),
  name: z.string().trim().min(3, "Informe ao menos 3 caracteres."),
  points: z.coerce.number().int().min(0, "A pontuação deve ser positiva."),
  phone: phoneSchema,
  cpf: cpfSchema,
  birthDate: z.coerce.date()
});

export const archivePlayerSchema = z.object({
  playerId: z.string().min(1)
});

export const updatePlayerPointsSchema = z.object({
  playerId: z.string().min(1),
  points: z.coerce.number().int().min(0, "A pontuação deve ser positiva.")
});

export const updateTournamentEntryPointsSchema = z.object({
  entryId: z.string().min(1),
  points: z.coerce.number().int().min(0, "A pontuação deve ser positiva.")
});

export const updateTournamentParticipantsSchema = z.object({
  tournamentId: z.string().trim().min(1, "Torneio inválido."),
  playerIds: z.array(z.string().trim().min(1)).default([])
});
