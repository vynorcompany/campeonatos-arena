import { z } from "zod";

const optionalText = z.string().trim().default("");

export const studentSchema = z.object({
  name: z.string().trim().default(""),
  playerId: z.string().trim().default(""),
  phone: optionalText,
  email: z
    .string()
    .trim()
    .email("Informe um e-mail válido.")
    .or(z.literal(""))
    .default(""),
  remainingClasses: z.coerce
    .number()
    .int()
    .min(0, "Aulas restantes inválidas.")
    .default(0),
  notes: optionalText,
});

export const teacherSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do professor."),
  phone: optionalText,
  email: z
    .string()
    .trim()
    .email("Informe um e-mail válido.")
    .or(z.literal(""))
    .default(""),
  monthlyTarget: z.coerce
    .number()
    .int()
    .min(0, "Meta mensal inválida.")
    .default(0),
  notes: optionalText,
});

export const lessonSchema = z.object({
  title: z.string().trim().min(2, "Informe o nome da aula."),
  teacherId: z.string().optional().default(""),
  scheduledAt: z.string().optional().default(""),
  durationMinutes: z.coerce.number().int().min(15).max(240).default(60),
  isPaid: z.string().optional().default(""),
  price: z.string().trim().optional().default(""),
  paymentMethod: z.string().trim().optional().default("PIX"),
  notes: optionalText,
});

