import { z } from "zod";

export const createArenaUserSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do usuário."),
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z.string().min(10, "A senha temporária deve ter no mínimo 10 caracteres."),
  arenaRole: z.enum(["OWNER", "ADMIN", "STAFF", "VIEWER"]),
  viewPermissions: z.array(z.string()).default([]),
  editPermissions: z.array(z.string()).default([])
});

export const updateArenaUserRoleSchema = z.object({
  userId: z.string().min(1, "Usuário inválido."),
  arenaRole: z.enum(["OWNER", "ADMIN", "STAFF", "VIEWER"])
});

export const updateArenaUserSchema = z.object({
  userId: z.string().min(1, "Usuário inválido."),
  name: z.string().trim().min(2, "Informe o nome do usuário."),
  email: z.string().trim().email("Informe um e-mail válido."),
  arenaRole: z.enum(["OWNER", "ADMIN", "STAFF", "VIEWER"]),
  viewPermissions: z.array(z.string()).default([]),
  editPermissions: z.array(z.string()).default([])
});

export const removeArenaUserSchema = z.object({
  userId: z.string().min(1, "Usuário inválido.")
});

export const resetArenaUserPasswordSchema = z.object({
  userId: z.string().min(1, "Usuário inválido."),
  password: z.string().min(10, "A nova senha deve ter no mínimo 10 caracteres.")
});

export const updateOwnProfileSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.")
});

export const updateOwnPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual."),
    newPassword: z.string().min(10, "A nova senha deve ter no mínimo 10 caracteres."),
    confirmPassword: z.string().min(10, "Confirme a nova senha.")
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "A confirmação da nova senha não confere.",
    path: ["confirmPassword"]
  });
