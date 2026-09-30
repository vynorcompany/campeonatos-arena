import "server-only";
import { env } from "@/lib/env";

export function accountEmailIsConfigured() {
  return Boolean(env.resendApiKey && env.emailFrom && env.appUrl);
}

export async function sendAccountEmail(to: string, subject: string, text: string) {
  if (!accountEmailIsConfigured()) throw new Error("Configure RESEND_API_KEY, EMAIL_FROM e APP_URL para enviar e-mails de acesso.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.emailFrom, to: [to], subject, text }),
    cache: "no-store"
  });
  if (!response.ok) throw new Error("Não foi possível enviar o e-mail. Confira o domínio remetente e a conexão de e-mail da agência.");
}
