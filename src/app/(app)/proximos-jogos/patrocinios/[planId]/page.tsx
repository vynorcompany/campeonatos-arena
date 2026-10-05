import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { AddSponsorToPlanButton, EditSponsorButton } from "@/components/sponsorship/sponsorship-plan-dialogs";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { deleteTvSponsorAction, insertSponsorInPlanAction, updateTvSponsorAction } from "@/lib/actions/upcoming-match";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const money = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

export default async function SponsorshipPlanPage(props: { params: Promise<{ planId: string }> }) {
  const params = await props.params;
  const auth = await requireModuleView("tv");
  const [plan, clients] = await Promise.all([
    prisma.sponsorshipPlan.findFirst({ where: { id: params.planId, arenaId: auth.arenaId }, include: { sponsors: { include: { player: { select: { name: true } } }, orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] } } }),
    prisma.player.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true, phone: true }, orderBy: { name: "asc" } })
  ]);
  if (!plan) return <section className={viewStyles.sponsor_empty_state}><strong>Plano não encontrado</strong><p>Ele pode ter sido removido.</p><Link href="/proximos-jogos/patrocinios" className={viewStyles.button_button_small}>Voltar aos planos</Link></section>;
  const planDetails = { name: plan.name, sponsorshipType: plan.sponsorshipType, monthlyAmount: (plan.monthlyAmountCents / 100).toFixed(2).replace(".", ","), reservationCredits: plan.reservationCredits, lessonCredits: plan.lessonCredits };
  return <div className={viewStyles.stack_md}><Link href="/proximos-jogos/patrocinios" className={viewStyles.sponsorship_back}>← Patrocínios</Link><header className={viewStyles.sponsorship_plan_hero}><div><p className={viewStyles.eyebrow}>PLANO DE PATROCÍNIO</p><h1>{plan.name}</h1><p>{plan.sponsorshipType} · {money(plan.monthlyAmountCents)}/mês</p></div><AddSponsorToPlanButton action={insertSponsorInPlanAction} planId={plan.id} clients={clients} monthlyAmount={planDetails.monthlyAmount} /></header><section className={viewStyles.sponsorship_metrics}><article><span>Empresas ativas</span><strong>{plan.sponsors.length}</strong></article><article><span>Saldo de reservas</span><strong>{plan.reservationCredits}</strong></article><article><span>Saldo de aulas</span><strong>{plan.lessonCredits}</strong></article></section><section className={viewStyles.section_card_sponsorship_companies_panel}><header><div><h2>Empresas do plano</h2><p className={viewStyles.muted}>Cada inclusão gera os lançamentos a receber deste plano.</p></div></header><div className={viewStyles.sponsorship_company_directory}>{plan.sponsors.map((sponsor) => <article key={sponsor.id}><div className={viewStyles.sponsor_company_identity}>{sponsor.logoUrl ? <img src={sponsor.logoUrl} alt="" /> : <span>{sponsor.name.slice(0, 1)}</span>}<div><strong>{sponsor.name}</strong><small>{sponsor.player?.name ? `Cliente vinculado: ${sponsor.player.name}` : "Cobrança em nome da empresa"}</small><small>{sponsor.installments} parcela(s) · vencimento dia {sponsor.dueDay}</small></div></div><div className={viewStyles.sponsorship_company_actions}><EditSponsorButton action={updateTvSponsorAction} sponsor={sponsor} plan={planDetails} /><SafeActionForm action={deleteTvSponsorAction}><input type="hidden" name="sponsorId" value={sponsor.id} /><SubmitButton label={`Excluir ${sponsor.name}`} pendingLabel="..." className={viewStyles.button_button_danger_button_small_sponsor_delete_button} /></SafeActionForm></div></article>)}{!plan.sponsors.length ? <p className={viewStyles.muted}>Nenhuma empresa inserida neste plano.</p> : null}</div></section></div>;
}
