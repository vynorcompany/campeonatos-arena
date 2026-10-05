import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { LoginBrandPanel } from "@/components/auth/login-brand-panel";
import { RequestPasswordResetForm } from "@/components/auth/account-access-forms";

export default function RecoverPasswordPage() {
  return <div className={viewStyles.auth_page_login_page}><div className={viewStyles.login_shell}><LoginBrandPanel /><main className={viewStyles.login_form_panel}><div className={viewStyles.login_form_content}><span className={viewStyles.login_form_eyebrow}>ACESSO À SUA ARENA</span><h1>Recuperar senha</h1><p className={viewStyles.login_form_intro}>Enviaremos um link de uso único para o e-mail da sua conta.</p><RequestPasswordResetForm /><p className={viewStyles.auth_switch}><Link href="/login">Voltar ao login</Link></p></div></main></div></div>;
}
