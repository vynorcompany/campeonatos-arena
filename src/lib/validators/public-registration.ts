import { z } from "zod";
import { normalizeBrazilianPhone } from "@/lib/phone";

const cpfSchema = z.string().trim().regex(/^\d{11}$/, "CPF deve ter 11 dígitos numéricos.");
const optionalBirthDateSchema = z.preprocess(value => value === "" || value == null ? null : value, z.coerce.date().nullable());
const optionalPartnerName = z.preprocess(value => value ?? "", z.union([z.literal(""), z.string().trim().min(3).refine(name => name.split(/\s+/).filter(Boolean).length >= 2, "Informe nome e sobrenome.")]));
const optionalPartnerPhone = z.preprocess(value => value ?? "", z.union([z.literal(""), z.string().trim().min(8)]));
const optionalPartnerCpf = z.preprocess(value => value ?? "", z.union([z.literal(""), cpfSchema]));
const publicPhoneSchema = z.string().trim().transform(normalizeBrazilianPhone).pipe(z.string().regex(/^[1-9]{2}(?:[2-5]\d{7}|9\d{8})$/, "Informe um telefone válido com DDD."));
const optionalPublicPhone = z.preprocess(value => value ?? "", z.union([z.literal(""), publicPhoneSchema]));
const registrationTypeSchema = z.enum(["PAIR", "INDIVIDUAL"]).default("PAIR");
const fullNameSchema = z.string().trim().min(3, "Informe nome e sobrenome.").refine((name) => name.split(/\s+/).filter(Boolean).length >= 2, "Informe nome e sobrenome.");

export const createPublicRegistrationSchema = z.object({
  tournamentSlug: z.string().trim().min(1),
  registrationType: registrationTypeSchema,
  categoryId: z.string().trim().min(1, "Selecione uma categoria."),
  paymentMethod: z.enum(["PIX", "CARD"]).default("PIX"),
  leadName: fullNameSchema,
  leadEmail: z.preprocess(value => value ?? "", z.union([z.literal(""), z.string().trim().email("Informe um e-mail válido do atleta.")])),
  leadPhone: publicPhoneSchema,
  leadCpf: optionalPartnerCpf,
  leadBirthDate: optionalBirthDateSchema,
  partnerName: optionalPartnerName,
  partnerPhone: optionalPublicPhone,
  partnerCpf: optionalPartnerCpf,
  partnerBirthDate: optionalBirthDateSchema,
  thirdName: z.preprocess(value => value ?? "", z.string().trim().max(160)),
  thirdPhone: optionalPublicPhone,
  thirdCpf: z.preprocess(value => value ?? "", z.string().trim().max(11)),
  thirdBirthDate: optionalBirthDateSchema
}).refine(registration => registration.registrationType === "INDIVIDUAL" || !!registration.leadEmail && !!registration.leadCpf, { message: "Informe e-mail e CPF do titular da equipe.", path: ["leadEmail"] }).refine(registration => registration.registrationType === "INDIVIDUAL" ? !registration.partnerName && !registration.partnerPhone && !registration.partnerCpf && !registration.thirdName && !registration.thirdCpf && !registration.thirdPhone : !!registration.partnerName && !!registration.partnerPhone && !!registration.partnerCpf, { message: "Informe os dados dos participantes conforme o tipo de inscrição.", path: ["partnerName"] }).refine((registration) => registration.registrationType === "INDIVIDUAL" || registration.leadCpf !== registration.partnerCpf, {
  message: "Os dois atletas da dupla devem ter CPFs diferentes.",
  path: ["partnerCpf"]
});

export const createManualTournamentRegistrationSchema = z.object({
  tournamentId: z.string().trim().min(1, "Torneio inválido."),
  registrationType: registrationTypeSchema,
  categoryId: z.string().trim().min(1, "Selecione uma categoria."),
  leadPlayerId: z.string().trim().min(1, "Selecione o primeiro atleta."),
  partnerPlayerId: z.preprocess(value => value ?? "", z.string().trim()),
  thirdPlayerId: z.preprocess(value => value || undefined, z.string().trim().min(1).optional()),
  amountReais: z.union([z.string(), z.number()]),
  bankAccountId: z.string().trim().max(100).optional(),
  paymentStatus: z.enum(["PENDING", "PAID"]).default("PENDING")
}).refine(registration => registration.registrationType === "INDIVIDUAL" ? !registration.partnerPlayerId && !registration.thirdPlayerId : !!registration.partnerPlayerId, { message: "Selecione os participantes conforme o tipo de inscrição.", path: ["partnerPlayerId"] });

export const updateManualTournamentRegistrationSchema = z.object({
  registrationId: z.string().trim().min(1, "Inscricao invalida."),
  tournamentId: z.string().trim().min(1, "Torneio inválido."),
  registrationType: registrationTypeSchema,
  categoryId: z.string().trim().min(1, "Selecione uma categoria."),
  leadName: fullNameSchema,
  leadPhone: z.string().trim().min(8, "Informe o telefone do atleta."),
  leadCpf: cpfSchema,
  leadBirthDate: optionalBirthDateSchema,
  partnerName: optionalPartnerName,
  partnerPhone: optionalPartnerPhone,
  partnerCpf: optionalPartnerCpf,
  partnerBirthDate: optionalBirthDateSchema,
  thirdName: z.preprocess(value => value ?? "", z.string().trim().max(160)),
  thirdPhone: z.preprocess(value => value ?? "", z.string().trim().max(30)),
  thirdCpf: z.preprocess(value => value ?? "", z.string().trim().max(11)),
  thirdBirthDate: optionalBirthDateSchema,
  amountReais: z.union([z.string(), z.number()]),
  bankAccountId: z.string().trim().max(100).optional(),
  paymentStatus: z.enum(["PENDING", "PAID"]).default("PENDING")
}).refine(registration => registration.registrationType === "INDIVIDUAL" ? !registration.partnerName && !registration.partnerPhone && !registration.partnerCpf && !registration.thirdName && !registration.thirdCpf && !registration.thirdPhone : !!registration.partnerName && !!registration.partnerPhone && !!registration.partnerCpf, { message: "Informe os dados dos participantes conforme o tipo de inscrição.", path: ["partnerName"] });
