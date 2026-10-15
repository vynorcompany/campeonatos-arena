import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { LoginBrandPanel } from "@/components/auth/login-brand-panel";
import { RequestPasswordResetForm } from "@/components/auth/account-access-forms";
import { accountEmailIsConfigured } from "@/lib/auth/account-email";

export const dynamic = "force-dynamic";

export default function RecoverPasswordPage() {
  const emailAvailable = accountEmailIsConfigured();
  return <div className={viewStyles.auth_page_login_page}><div className={viewStyles.login_shell}><LoginBrandPanel /><main className={viewStyles.login_form_panel}><div className={viewStyles.login_form_content}><span className={viewStyles.login_form_eyebrow}>ACESSO À SUA ARENA</span><h1>Recuperar senha</h1>{emailAvailable ? <><p className={viewStyles.login_form_intro}>Enviaremos um link de uso único para o e-mail da sua conta.</p><RequestPasswordResetForm /></> : <p className={viewStyles.login_form_intro} role="status">A recuperação por e-mail está temporariamente indisponível. Peça ao proprietário da arena ou ao suporte da agência um link privado de recuperação. O link pode ser gerado em Usuários &gt; Recuperar acesso e vale por 30 minutos.</p>}<p className={viewStyles.auth_switch}><Link href="/login">Voltar ao login</Link></p></div></main></div></div>;
}
