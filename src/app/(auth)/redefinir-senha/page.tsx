import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { LoginBrandPanel } from "@/components/auth/login-brand-panel";
import { CompletePasswordResetForm } from "@/components/auth/account-access-forms";
import { getAccountTokenInfo } from "@/lib/auth/account-token-info";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const { valid } = await getAccountTokenInfo('RESET', token);
  return <div className={viewStyles.auth_page_login_page}><div className={viewStyles.login_shell}><LoginBrandPanel /><main className={viewStyles.login_form_panel}><div className={viewStyles.login_form_content}><span className={viewStyles.login_form_eyebrow}>ACESSO À SUA ARENA</span><h1>Nova senha</h1>{valid ? <><p className={viewStyles.login_form_intro}>Defina uma senha com pelo menos 10 caracteres.</p><CompletePasswordResetForm token={token} /></> : <p className={viewStyles.form_error}>Este link expirou ou já foi utilizado. <Link href="/recuperar-senha">Solicitar outro link</Link>.</p>}<p className={viewStyles.auth_switch}><Link href="/login">Voltar ao login</Link></p></div></main></div></div>;
}
