import { viewStyles } from "./page.utilities";
import { logoutAction } from "@/lib/auth/actions";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getAgencyDelinquency } from "@/lib/finance/agency-delinquency";

export default async function AccessUnavailablePage() {
  const auth = await requireAuth();
  const [subscription, delinquency] = auth.arenaId ? await Promise.all([prisma.agencySubscription.findUnique({ where: { arenaId: auth.arenaId }, include: { plan: true, invoices: { where: { status: "PENDING" }, orderBy: { dueAt: "asc" }, take: 1 } } }), getAgencyDelinquency(auth.arenaId)]) : [null, null];
  return <main className={viewStyles.access_unavailable_page}><section className={viewStyles.access_unavailable_card}><span className={viewStyles.eyebrow}>Arena Padel Manager</span><h1>Acesso à arena indisponível</h1><p>{delinquency?.blocked ? "A fatura do sistema não foi paga até o fim do prazo configurado pela agência. O acesso será restabelecido após a confirmação do pagamento." : subscription?.plan.isTrial && subscription.trialEndsAt && subscription.trialEndsAt <= new Date() ? "O período de avaliação de 7 dias terminou." : "A assinatura ou a conta desta arena está pausada ou cancelada."} Entre em contato com o administrador da plataforma se precisar de ajuda.</p>{subscription?.invoices[0]?.checkoutUrl ? <a className={viewStyles.button_button_primary} href={subscription.invoices[0].checkoutUrl} target="_blank" rel="noopener noreferrer">Pagar fatura em aberto</a> : null}<form action={logoutAction}><button className={viewStyles.button}>Sair da conta</button></form></section></main>;
}
