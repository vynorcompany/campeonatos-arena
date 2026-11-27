import { viewStyles } from "./page.utilities";
import { logoutAction } from "@/lib/auth/actions";
import { requireAuth } from "@/lib/auth/session";
import { getAccessUnavailable } from "@/lib/management/utilities";

export default async function AccessUnavailablePage() {
  await requireAuth();
  const access = await getAccessUnavailable();
  return <main className={viewStyles.access_unavailable_page}><section className={viewStyles.access_unavailable_card}><span className={viewStyles.eyebrow}>VX4</span><h1>Acesso à arena indisponível</h1><p>{access.reason === "OVERDUE" ? "A fatura do sistema não foi paga até o fim do prazo configurado pela agência. O acesso será restabelecido após a confirmação do pagamento." : access.reason === "TRIAL_ENDED" ? "O período de avaliação de 7 dias terminou." : "A assinatura ou a conta desta arena está pausada ou cancelada."} Entre em contato com o administrador da plataforma se precisar de ajuda.</p>{access.checkoutUrl ? <a className={viewStyles.button_button_primary} href={access.checkoutUrl} target="_blank" rel="noopener noreferrer">Pagar fatura em aberto</a> : null}<form action={logoutAction}><button className={viewStyles.button}>Sair da conta</button></form></section></main>;
}
