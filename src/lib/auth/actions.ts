"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, getAuthContext } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validators/auth";

export type LoginState = {
  error: string | null;
};

export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const user = await prisma.user.findUnique({
    where: {
      email: parsed.data.email
    }
  });

  if (!user) {
    return { error: "Usuário não encontrado." };
  }

  const passwordMatches = await bcrypt.compare(parsed.data.password, user.passwordHash);

  if (!passwordMatches) {
    return { error: "Senha incorreta." };
  }

  await createSession(user.id);
  redirect("/painel");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function redirectIfAuthenticated() {
  const auth = await getAuthContext();

  if (auth) {
    redirect("/painel");
  }
}
