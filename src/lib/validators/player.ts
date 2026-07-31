import { z } from "zod";

const eligibilityFieldSchema = z.preprocess(
  (value) => value ?? "",
  z.string().trim().max(40)
);
const cpfSchema = z.string().trim().regex(/^\d{11}$/, "CPF deve ter 11 dígitos numéricos.");
const phoneSchema = z.string().trim().min(8, "Informe um telefone válido.");

const optionalCpfSchema = z.preprocess(
  (value) => value ?? "",
  z.string().trim().refine((value) => !value || /^\d{11}$/.test(value), "CPF inválido."),
);
const optionalPhoneSchema = z.preprocess(
  (value) => value ?? "",
  z.string().trim().refine((value) => !value || value.length >= 8, "Telefone inválido."),
);
const optionalBirthDateSchema = z.preprocess(
  (value) => value || null,
  z.coerce.date().nullable(),
);

export const createPlayerSchema = z.object({
  name: z.string().trim().min(3, "Informe ao menos 3 caracteres."),
  points: z.coerce.number().int().min(0, "A pontuação deve ser positiva."),
  class: eligibilityFieldSchema,
  gender: eligibilityFieldSchema,
  phone: optionalPhoneSchema,
  cpf: optionalCpfSchema,
  birthDate: optionalBirthDateSchema
});

export const updatePlayerSchema = z.object({
  playerId: z.string().min(1),
  name: z.string().trim().min(3, "Informe ao menos 3 caracteres."),
  points: z.coerce.number().int().min(0, "A pontuação deve ser positiva."),
  class: eligibilityFieldSchema,
  gender: eligibilityFieldSchema,
  phone: optionalPhoneSchema,
  cpf: optionalCpfSchema,
  birthDate: optionalBirthDateSchema
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
