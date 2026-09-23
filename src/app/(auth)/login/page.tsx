import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";
import { redirectIfAuthenticated } from "@/lib/auth/actions";

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return (
    <div className="auth-page login-page">
      <div className="login-shell">
        <aside className="login-brand-panel" aria-label="Arena Padel Manager">
          <div className="login-brand"><span className="login-brand-mark" aria-hidden="true">A</span><span><strong>ARENA</strong><small>PADEL MANAGER</small></span></div>
          <div className="login-brand-message"><span className="login-kicker">GESTÃO EM UM SÓ LUGAR</span><h2>Sua operação em jogo. Tudo sob controle.</h2><p>Agenda, torneios, clientes e financeiro conectados em um único espaço de trabalho.</p></div>
          <p className="login-brand-footer">Uma experiência para quem vive a arena todos os dias.</p>
        </aside>
        <main className="login-form-panel">
          <div className="login-form-content">
            <span className="login-form-eyebrow">BEM-VINDO DE VOLTA</span>
            <h1>Entre na sua conta</h1>
            <p className="login-form-intro">Acesse o painel da sua arena ou a visão da agência.</p>
            <LoginForm />
            <p className="auth-switch">Ainda não tem arena? <Link href="/cadastro">Cadastrar arena</Link></p>
          </div>
        </main>
      </div>
    </div>
  );
}
