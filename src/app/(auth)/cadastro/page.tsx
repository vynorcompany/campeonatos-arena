import Image from "next/image";
import Link from "next/link";
import { RegisterArenaForm } from "@/components/forms/register-arena-form";
import { redirectIfAuthenticated } from "@/lib/auth/actions";

export default async function RegisterArenaPage() {
  await redirectIfAuthenticated();

  return (
    <div className="auth-page">
      <div className="auth-card stack-md">
        <div className="auth-logo-wrap">
          <Image
            src="/arena-profile.jpg"
            alt="Logo da Arena Padel"
            width={84}
            height={84}
            className="auth-logo"
            priority
          />
        </div>

        <div className="stack-xs">
          <p className="eyebrow">Arena Padel Manager</p>
          <h1>Cadastrar arena</h1>
          <p className="muted">
            Crie a conta principal da arena. Depois você poderá convidar usuários e liberar módulos por permissão.
          </p>
        </div>

        <RegisterArenaForm />

        <p className="auth-switch">
          Já tem conta? <Link href="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
