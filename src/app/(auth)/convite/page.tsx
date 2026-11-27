import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { LoginBrandPanel } from "@/components/auth/login-brand-panel";
import { AcceptInviteForm } from "@/components/auth/account-access-forms";
import { getAccountTokenInfo } from "@/lib/auth/account-token-info";

export default async function ArenaInvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const { valid, invitation } = await getAccountTokenInfo('INVITE', token);
  return <div className={viewStyles.auth_page_login_page}><div className={viewStyles.login_shell}><LoginBrandPanel /><main className={viewStyles.login_form_panel}><div className={viewStyles.login_form_content}><span className={viewStyles.login_form_eyebrow}>CONVITE DE ACESSO</span><h1>{invitation ? `Acesse ${invitation.arenaName}` : "Convite indisponível"}</h1>{valid && invitation ? <><p className={viewStyles.login_form_intro}>Este convite vincula {invitation.email} à arena.</p><AcceptInviteForm token={token} existingUser={invitation.existingUser} /></> : <p className={viewStyles.form_error}>O convite expirou ou já foi utilizado. Peça um novo link ao administrador da arena.</p>}<p className={viewStyles.auth_switch}><Link href="/login">Voltar ao login</Link></p></div></main></div></div>;
}
