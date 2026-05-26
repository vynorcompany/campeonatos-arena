import { z } from "zod";

const cpfSchema = z.string().trim().regex(/^\d{11}$/, "CPF deve ter 11 dígitos numéricos.");

export const createPublicRegistrationSchema = z.object({
  tournamentSlug: z.string().trim().min(1),
  categoryId: z.string().trim().min(1, "Selecione uma categoria."),
  leadName: z.string().trim().min(3, "Informe o nome do atleta."),
  leadEmail: z.string().trim().email("Informe um e-mail válido do atleta."),
  leadPhone: z.string().trim().min(8, "Informe o telefone do atleta."),
  leadCpf: cpfSchema,
  leadBirthDate: z.coerce.date(),
  partnerName: z.string().trim().min(3, "Informe o nome da dupla."),
  partnerPhone: z.string().trim().min(8, "Informe o telefone da dupla."),
  partnerCpf: cpfSchema,
  partnerBirthDate: z.coerce.date()
});
