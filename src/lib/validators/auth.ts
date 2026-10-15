import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido."),
  // O tamanho mínimo vale para senhas novas; o login deve aceitar senhas
  // legadas e conferir a credencial real pelo hash armazenado.
  password: z.string().min(1, "Informe sua senha.")
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
