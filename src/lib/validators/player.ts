import { z } from "zod";

const eligibilityFieldSchema = z.preprocess(
  (value) => value ?? "",
  z.string().trim().max(40)
);

export const createPlayerSchema = z.object({
  name: z.string().trim().min(3, "Informe ao menos 3 caracteres."),
  points: z.coerce.number().int().min(0, "A pontuação deve ser positiva."),
  class: eligibilityFieldSchema,
  gender: eligibilityFieldSchema
});

export const updatePlayerSchema = z.object({
  playerId: z.string().min(1),
  name: z.string().trim().min(3, "Informe ao menos 3 caracteres."),
  points: z.coerce.number().int().min(0, "A pontuação deve ser positiva."),
  class: eligibilityFieldSchema,
  gender: eligibilityFieldSchema
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
