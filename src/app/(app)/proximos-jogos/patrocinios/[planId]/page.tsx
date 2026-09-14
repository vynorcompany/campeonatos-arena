import Link from "next/link";
import { AddSponsorToPlanButton, EditSponsorButton } from "@/components/sponsorship/sponsorship-plan-dialogs";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { deleteTvSponsorAction, insertSponsorInPlanAction, updateTvSponsorAction } from "@/lib/actions/upcoming-match";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const money = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

export default async function SponsorshipPlanPage({ params }: { params: { planId: string } }) {
  const auth = await requireModuleView("tv");
  const [plan, clients] = await Promise.all([
    prisma.sponsorshipPlan.findFirst({ where: { id: params.planId, arenaId: auth.arenaId }, include: { sponsors: { include: { player: { select: { name: true } } }, orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] } } }),
    prisma.player.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true, phone: true }, orderBy: { name: "asc" } })
  ]);
  if (!plan) return <section className="sponsor-empty-state"><strong>Plano não encontrado</strong><p>Ele pode ter sido removido.</p><Link href="/proximos-jogos/patrocinios" className="button button-small">Voltar aos planos</Link></section>;
  const planDetails = { name: plan.name, sponsorshipType: plan.sponsorshipType, monthlyAmount: (plan.monthlyAmountCents / 100).toFixed(2).replace(".", ","), reservationCredits: plan.reservationCredits, lessonCredits: plan.lessonCredits };
  return <div className="stack-md sponsorship-plan-workspace"><Link href="/proximos-jogos/patrocinios" className="sponsorship-back">← Patrocínios</Link><header className="sponsorship-plan-hero"><div><p className="eyebrow">PLANO DE PATROCÍNIO</p><h1>{plan.name}</h1><p>{plan.sponsorshipType} · {money(plan.monthlyAmountCents)}/mês</p></div><AddSponsorToPlanButton action={insertSponsorInPlanAction} planId={plan.id} clients={clients} monthlyAmount={planDetails.monthlyAmount} /></header><section className="sponsorship-metrics"><article><span>Empresas ativas</span><strong>{plan.sponsors.length}</strong></article><article><span>Saldo de reservas</span><strong>{plan.reservationCredits}</strong></article><article><span>Saldo de aulas</span><strong>{plan.lessonCredits}</strong></article></section><section className="section-card sponsorship-companies-panel"><header><div><h2>Empresas do plano</h2><p className="muted">Cada inclusão gera os lançamentos a receber deste plano.</p></div></header><div className="sponsorship-company-directory">{plan.sponsors.map((sponsor) => <article key={sponsor.id}><div className="sponsor-company-identity">{sponsor.logoUrl ? <img src={sponsor.logoUrl} alt="" /> : <span>{sponsor.name.slice(0, 1)}</span>}<div><strong>{sponsor.name}</strong><small>{sponsor.player?.name ? `Cliente vinculado: ${sponsor.player.name}` : "Cobrança em nome da empresa"}</small><small>{sponsor.installments} parcela(s) · vencimento dia {sponsor.dueDay}</small></div></div><div className="sponsorship-company-actions"><EditSponsorButton action={updateTvSponsorAction} sponsor={sponsor} plan={planDetails} /><SafeActionForm action={deleteTvSponsorAction}><input type="hidden" name="sponsorId" value={sponsor.id} /><SubmitButton label={`Excluir ${sponsor.name}`} pendingLabel="..." className="button button-danger button-small sponsor-delete-button" /></SafeActionForm></div></article>)}{!plan.sponsors.length ? <p className="muted">Nenhuma empresa inserida neste plano.</p> : null}</div></section></div>;
}
