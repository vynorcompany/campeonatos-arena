import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { LoginForm } from "@/components/forms/login-form";
import { LoginBrandPanel } from "@/components/auth/login-brand-panel";
import { redirectIfAuthenticated } from "@/lib/auth/actions";

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return (
    <div className={viewStyles.auth_page_login_page}>
      <div className={viewStyles.login_shell}>
        <LoginBrandPanel />
        <main className={viewStyles.login_form_panel}>
          <div className={viewStyles.login_form_content}>
            <span className={viewStyles.login_form_eyebrow}>BEM-VINDO DE VOLTA</span>
            <h1>Entre na sua conta</h1>
            <p className={viewStyles.login_form_intro}>Acesse o painel da sua arena ou a visão da agência.</p>
            <LoginForm />
            <p className={viewStyles.auth_switch}>Ainda não tem arena? <Link href="/cadastro">Cadastrar arena</Link></p>
            <p className={viewStyles.auth_switch}>Foi convidado para uma arena? Abra o link recebido por e-mail para criar seu acesso.</p>
          </div>
        </main>
      </div>
    </div>
  );
}
