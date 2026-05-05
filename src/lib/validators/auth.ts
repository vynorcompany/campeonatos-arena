import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido."),
  password: z.string().min(8, "Senha inválida.")
});

export const registerArenaSchema = z
  .object({
    arenaName: z.string().trim().min(2, "Informe o nome da arena."),
    ownerName: z.string().trim().min(2, "Informe seu nome."),
    email: z.string().trim().email("Informe um e-mail válido."),
    password: z.string().min(10, "A senha deve ter no mínimo 10 caracteres."),
    confirmPassword: z.string().min(10, "Confirme a senha.")
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "A confirmação de senha não confere.",
    path: ["confirmPassword"]
  });
