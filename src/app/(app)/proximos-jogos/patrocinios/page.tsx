import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { AddSponsorToPlanButton, CreateSponsorshipPlanButton } from "@/components/sponsorship/sponsorship-plan-dialogs";
import { createSponsorshipPlanAction, createTvSponsorAction, deleteSponsorshipPlanAction, deleteTvSponsorAction } from "@/lib/actions/upcoming-match";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const asCurrency = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export default async function SponsorshipManagementPage() {
  const auth = await requireModuleView("tv");
  const [plans, legacySponsors] = await Promise.all([
    prisma.sponsorshipPlan.findMany({ where: { arenaId: auth.arenaId }, include: { sponsors: { orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] } }, orderBy: { createdAt: "asc" } }),
    prisma.tvSponsor.findMany({ where: { arenaId: auth.arenaId, sponsorshipPlanId: null }, orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] })
  ]);

  return <div className="stack-md sponsorship-management-page">
    <div className="active-event-back"><CreateSponsorshipPlanButton action={createSponsorshipPlanAction} /></div>
    {plans.length ? <div className="active-event-list sponsor-plan-list">
      {plans.map((plan) => <article className="active-event-row sponsor-plan-row" key={plan.id}>
        <div><strong>{plan.name}</strong><span>{plan.sponsorshipType} · R$ {asCurrency(plan.monthlyAmountCents)}/mês</span><div className="sponsor-benefit-tags">{plan.reservationCredits ? <span>{plan.reservationCredits} reserva(s) por ciclo</span> : null}{plan.lessonCredits ? <span>{plan.lessonCredits} aula(s) por ciclo</span> : null}{!plan.reservationCredits && !plan.lessonCredits ? <span>Sem saldo incluído</span> : null}</div></div>
        <section className="sponsor-company-list"><strong>Empresas · {plan.sponsors.length}</strong>{plan.sponsors.length ? plan.sponsors.map((sponsor) => <div className="sponsor-company-row" key={sponsor.id}>{sponsor.logoUrl ? <img src={sponsor.logoUrl} alt="" /> : <span>{sponsor.name.slice(0, 1)}</span>}<b>{sponsor.name}</b><SafeActionForm action={deleteTvSponsorAction}><input type="hidden" name="sponsorId" value={sponsor.id} /><SubmitButton label={`Excluir ${sponsor.name}`} pendingLabel="..." className="button button-danger button-small sponsor-delete-button" /></SafeActionForm></div>) : <p className="muted">Ainda não há empresa vinculada.</p>}</section>
        <div className="active-event-actions"><AddSponsorToPlanButton action={createTvSponsorAction} planId={plan.id} order={plan.sponsors.length + 1} /><SafeActionForm action={deleteSponsorshipPlanAction}><input type="hidden" name="planId" value={plan.id} /><SubmitButton label="Excluir plano" pendingLabel="Excluindo..." className="button button-secondary button-small" /></SafeActionForm></div>
      </article>)}
    </div> : <section className="sponsor-empty-state"><strong>Nenhum plano cadastrado</strong><p>Crie um plano e, em seguida, inclua as empresas que fazem parte dele.</p></section>}
    {legacySponsors.length ? <section className="sponsor-legacy-list"><strong>Empresas sem plano</strong><div>{legacySponsors.map((sponsor) => <span key={sponsor.id}>{sponsor.name}</span>)}</div><p>Crie um plano para organizar estas empresas e os benefícios vinculados.</p></section> : null}
  </div>;
}
