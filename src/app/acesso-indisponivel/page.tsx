import { logoutAction } from "@/lib/auth/actions";
import { requireAuth } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function AccessUnavailablePage() {
  const auth = await requireAuth();
  const subscription = auth.arenaId ? await prisma.agencySubscription.findUnique({ where: { arenaId: auth.arenaId }, include: { plan: true, invoices: { where: { status: "PENDING" }, orderBy: { dueAt: "desc" }, take: 1 } } }) : null;
  return <main className="access-unavailable-page"><section className="access-unavailable-card"><span className="eyebrow">Arena Padel Manager</span><h1>Acesso à arena indisponível</h1><p>{subscription?.plan.isTrial && subscription.trialEndsAt && subscription.trialEndsAt <= new Date() ? "O período de avaliação de 7 dias terminou." : "A assinatura ou a conta desta arena está pausada ou cancelada."} Entre em contato com o administrador da plataforma para regularizar o acesso.</p>{subscription?.invoices[0]?.checkoutUrl ? <a className="button button-primary" href={subscription.invoices[0].checkoutUrl} target="_blank" rel="noopener noreferrer">Pagar fatura em aberto</a> : null}<form action={logoutAction}><button className="button">Sair da conta</button></form></section></main>;
}
