import { z } from "zod";

export const fullNameSchema = z.string().trim().min(3, "Informe nome e sobrenome.").refine(
  (name) => name.split(/\s+/).filter(Boolean).length >= 2,
  "Informe nome e sobrenome."
);

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
const optionalAddressField = z.preprocess((value) => value ?? "", z.string().trim().max(120));
const optionalAddressUpdateField = z.preprocess((value) => value === null ? undefined : value, z.string().trim().max(120).optional());

export const createPlayerSchema = z.object({
  name: fullNameSchema,
  points: z.coerce.number().int().min(0, "A pontuação deve ser positiva."),
  class: eligibilityFieldSchema,
  gender: eligibilityFieldSchema,
  phone: optionalPhoneSchema,
  email: z.preprocess((value) => value ?? "", z.string().trim().email("E-mail inválido.").or(z.literal(""))),
  cpf: optionalCpfSchema,
  addressZipCode: optionalAddressField,
  addressStreet: optionalAddressField,
  addressNumber: optionalAddressField,
  addressNeighborhood: optionalAddressField,
  addressCity: optionalAddressField,
  addressState: optionalAddressField,
  birthDate: optionalBirthDateSchema,
  leagueTier: z.preprocess((value) => value ?? "", z.enum(["", "A", "B"])),
  isTeacher: z.preprocess((value) => value === "on" || value === true, z.boolean())
});

export const updatePlayerSchema = z.object({
  playerId: z.string().min(1),
  name: fullNameSchema,
  points: z.coerce.number().int().min(0, "A pontuação deve ser positiva."),
  class: eligibilityFieldSchema,
  gender: eligibilityFieldSchema,
  phone: optionalPhoneSchema,
  email: z.preprocess((value) => value === null ? undefined : value, z.string().trim().email("E-mail inválido.").or(z.literal("")).optional()),
  cpf: optionalCpfSchema,
  addressZipCode: optionalAddressUpdateField,
  addressStreet: optionalAddressUpdateField,
  addressNumber: optionalAddressUpdateField,
  addressNeighborhood: optionalAddressUpdateField,
  addressCity: optionalAddressUpdateField,
  addressState: optionalAddressUpdateField,
  birthDate: optionalBirthDateSchema,
  leagueTier: z.preprocess((value) => value === null ? undefined : value, z.enum(["", "A", "B"]).optional()),
  isTeacher: z.preprocess((value) => value === null ? undefined : value === "on" || value === true, z.boolean().optional())
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

const clientIdentity = {
  personType: z.preprocess(value => value ?? "PF", z.enum(["PF", "PJ"])),
  cnpj: z.preprocess(value => value ?? "", z.string().trim().toUpperCase().refine(value => !value || /^[A-Z0-9]{12}\d{2}$/.test(value), "CNPJ deve ter 14 posições, com os dois últimos dígitos numéricos.")),
  name: z.string().trim().min(2, "Informe o nome ou razão social."),
  allowOverdueComandas: z.boolean().optional(),
};
function validateClientName(data: {personType:string;name:string}, ctx: z.RefinementCtx) {
  if (data.personType === "PF" && !fullNameSchema.safeParse(data.name).success) ctx.addIssue({code:"custom",path:["name"],message:"Informe nome e sobrenome."});
}
export const createClientSchema = createPlayerSchema.extend(clientIdentity).superRefine(validateClientName);
export const updateClientSchema = updatePlayerSchema.extend({...clientIdentity, personType: z.preprocess(value => value === null ? undefined : value, z.enum(["PF","PJ"]).optional()), cnpj: clientIdentity.cnpj.optional()}).superRefine((data,ctx) => validateClientName({...data,personType:data.personType??"PF"},ctx));

export const quickClientSchema = createPlayerSchema.pick({name:true,phone:true,email:true,cpf:true,class:true,gender:true,birthDate:true}).extend({...clientIdentity,phone:z.string().trim().min(8,"Informe um telefone válido.").max(30)}).superRefine(validateClientName);
