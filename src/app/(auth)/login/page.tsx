import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";
import { LoginBrandPanel } from "@/components/auth/login-brand-panel";
import { redirectIfAuthenticated } from "@/lib/auth/actions";

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return (
    <div className="auth-page login-page">
      <div className="login-shell">
        <LoginBrandPanel />
        <main className="login-form-panel">
          <div className="login-form-content">
            <span className="login-form-eyebrow">BEM-VINDO DE VOLTA</span>
            <h1>Entre na sua conta</h1>
            <p className="login-form-intro">Acesse o painel da sua arena ou a visão da agência.</p>
            <LoginForm />
            <p className="auth-switch">Ainda não tem arena? <Link href="/cadastro">Cadastrar arena</Link></p>
            <p className="auth-switch">Foi convidado para uma arena? Abra o link recebido por e-mail para criar seu acesso.</p>
          </div>
        </main>
      </div>
    </div>
  );
}
