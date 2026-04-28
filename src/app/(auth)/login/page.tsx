import Image from "next/image";
import { LoginForm } from "@/components/forms/login-form";
import { redirectIfAuthenticated } from "@/lib/auth/actions";

export default async function LoginPage() {
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
          <p className="eyebrow">Arena Padel</p>
          <h1>Acesse sua conta</h1>
          <p className="muted">
            Entre para acompanhar torneios, organizar confrontos e manter o cadastro da arena sempre atualizado.
          </p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
