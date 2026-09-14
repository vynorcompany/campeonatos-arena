import { SafeActionForm } from "@/components/forms/safe-action-form";
import { CurrencyInput } from "@/components/forms/currency-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { SectionCard } from "@/components/section-card";
import { createSponsorshipPlanAction, createTvSponsorAction, deleteSponsorshipPlanAction, deleteTvSponsorAction } from "@/lib/actions/upcoming-match";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const asCurrency = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
const planTypes = ["Mensal", "Evento", "Liga", "Permuta"];

function CompanyForm({ planId, order }: { planId: string; order: number }) {
  return <SafeActionForm action={createTvSponsorAction} className="grid-form sponsor-company-form" resetOnSuccess successMessage="Empresa adicionada ao plano.">
    <input type="hidden" name="sponsorshipPlanId" value={planId} /><input type="hidden" name="displayOrder" value={order} /><input type="hidden" name="subtitle" value="" /><input type="hidden" name="sponsorshipType" value="" /><input type="hidden" name="monthlyAmount" value="0" /><input type="hidden" name="reservationCredits" value="0" /><input type="hidden" name="lessonCredits" value="0" />
    <label className="field">Empresa<input name="name" required placeholder="Nome da empresa" /></label><label className="field">Logo<input name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" /></label><div className="form-full"><SubmitButton label="Adicionar empresa" pendingLabel="Adicionando..." className="button button-primary" /></div>
  </SafeActionForm>;
}

export default async function SponsorshipManagementPage() {
  const auth = await requireModuleView("tv");
  const [plans, legacySponsors] = await Promise.all([
    prisma.sponsorshipPlan.findMany({ where: { arenaId: auth.arenaId }, include: { sponsors: { orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] } }, orderBy: { createdAt: "asc" } }),
    prisma.tvSponsor.findMany({ where: { arenaId: auth.arenaId, sponsorshipPlanId: null }, orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] })
  ]);
  return <div className="stack-md sponsorship-management-page"><SectionCard title="">
    <details className="sponsor-plan-create"><summary className="button button-primary">Criar plano</summary><SafeActionForm action={createSponsorshipPlanAction} className="grid-form sponsor-plan-form" resetOnSuccess successMessage="Plano criado."><label className="field">Nome do plano<input name="name" required placeholder="Ex.: Patrocinador ouro" /></label><label className="field">Tipo<select name="sponsorshipType" defaultValue="Mensal">{planTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label className="field">Valor mensal<CurrencyInput name="monthlyAmount" defaultValue="0,00" required /></label><fieldset className="sponsor-benefit-options form-full"><legend>Créditos por ciclo</legend><label>Reservas<input name="reservationCredits" type="number" min="0" defaultValue="0" /></label><label>Aulas<input name="lessonCredits" type="number" min="0" defaultValue="0" /></label></fieldset><div className="form-full"><SubmitButton label="Salvar plano" pendingLabel="Salvando..." className="button button-primary" /></div></SafeActionForm></details>
    <div className="sponsor-management-list">{plans.map((plan) => <article className="sponsor-management-card sponsor-plan-card" key={plan.id}><header><div><strong>{plan.name}</strong><p className="muted">{plan.sponsorshipType} · R$ {asCurrency(plan.monthlyAmountCents)}/mês</p></div><div className="sponsor-benefit-tags">{plan.reservationCredits ? <span>{plan.reservationCredits} reserva(s)</span> : null}{plan.lessonCredits ? <span>{plan.lessonCredits} aula(s)</span> : null}</div></header><section className="sponsor-company-list"><strong>Empresas no plano</strong>{plan.sponsors.length ? plan.sponsors.map((sponsor) => <div className="sponsor-company-row" key={sponsor.id}>{sponsor.logoUrl ? <img src={sponsor.logoUrl} alt="" /> : <span>{sponsor.name.slice(0, 1)}</span>}<b>{sponsor.name}</b><SafeActionForm action={deleteTvSponsorAction}><input type="hidden" name="sponsorId" value={sponsor.id} /><SubmitButton label="Excluir empresa" pendingLabel="..." className="button button-danger button-small" /></SafeActionForm></div>) : <p className="muted">Nenhuma empresa neste plano.</p>}</section><details className="sponsor-plan-edit"><summary>Inserir empresa</summary><CompanyForm planId={plan.id} order={plan.sponsors.length + 1} /></details><SafeActionForm action={deleteSponsorshipPlanAction}><input type="hidden" name="planId" value={plan.id} /><SubmitButton label="Excluir plano" pendingLabel="Excluindo..." className="button button-secondary button-small" /></SafeActionForm></article>)}</div>
    {legacySponsors.length ? <section className="sponsor-legacy-list"><strong>Empresas sem plano</strong>{legacySponsors.map((sponsor) => <p key={sponsor.id}>{sponsor.name}</p>)}</section> : null}{!plans.length ? <p className="muted">Crie um plano e inclua as empresas que fazem parte dele.</p> : null}
  </SectionCard></div>;
}
