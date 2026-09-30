import Link from "next/link";
import { LoginBrandPanel } from "@/components/auth/login-brand-panel";
import { RequestPasswordResetForm } from "@/components/auth/account-access-forms";

export default function RecoverPasswordPage() {
  return <div className="auth-page login-page"><div className="login-shell"><LoginBrandPanel /><main className="login-form-panel"><div className="login-form-content"><span className="login-form-eyebrow">ACESSO À SUA ARENA</span><h1>Recuperar senha</h1><p className="login-form-intro">Enviaremos um link de uso único para o e-mail da sua conta.</p><RequestPasswordResetForm /><p className="auth-switch"><Link href="/login">Voltar ao login</Link></p></div></main></div></div>;
}
