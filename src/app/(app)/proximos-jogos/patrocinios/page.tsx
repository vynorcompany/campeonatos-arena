import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { CreateSponsorshipPlanButton } from "@/components/sponsorship/sponsorship-plan-dialogs";
import { createSponsorshipPlanAction, deleteSponsorshipPlanAction, deleteTvSponsorAction } from "@/lib/actions/upcoming-match";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const asCurrency = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export default async function SponsorshipManagementPage({ searchParams }: { searchParams?: { q?: string; type?: string; sort?: string } }) {
  const auth = await requireModuleView("tv");
  const query = String(searchParams?.q ?? "").trim();
  const type = String(searchParams?.type ?? "").trim();
  const sort = String(searchParams?.sort ?? "name");
  const [plans, planTypeRows] = await Promise.all([
    prisma.sponsorshipPlan.findMany({ where: { arenaId: auth.arenaId, ...(query ? { name: { contains: query, mode: "insensitive" } } : {}), ...(type ? { sponsorshipType: type } : {}) }, include: { sponsors: { orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] } }, orderBy: { createdAt: "asc" } }),
    prisma.sponsorshipPlan.findMany({ where: { arenaId: auth.arenaId }, select: { sponsorshipType: true }, distinct: ["sponsorshipType"] })
  ]);
  const orderedPlans = [...plans].sort((first, second) => sort === "value" ? second.monthlyAmountCents - first.monthlyAmountCents : sort === "companies" ? second.sponsors.length - first.sponsors.length : first.name.localeCompare(second.name, "pt-BR"));
  const planTypes = planTypeRows.map((plan) => plan.sponsorshipType).sort((first, second) => first.localeCompare(second, "pt-BR"));

  return <div className="stack-md sponsorship-management-page">
    <section className="sponsorship-management-toolbar"><form method="get" className="sponsorship-filter-form"><label>Pesquisa<input name="q" defaultValue={query} placeholder="Digite o nome do plano" /></label><label>Filtros<input name="type" list="sponsorship-plan-types" defaultValue={type} placeholder="Todos os tipos" /><datalist id="sponsorship-plan-types">{planTypes.map((item) => <option key={item} value={item} />)}</datalist></label><label>Classificação<select name="sort" defaultValue={sort}><option value="name">Nome do plano</option><option value="value">Maior valor mensal</option><option value="companies">Mais empresas</option></select></label><button className="button button-small" type="submit">Aplicar</button></form><CreateSponsorshipPlanButton action={createSponsorshipPlanAction} /></section>
    {orderedPlans.length ? <div className="active-event-list sponsor-plan-list">
      {orderedPlans.map((plan) => <article className="active-event-row sponsor-plan-row" key={plan.id}>
        <div><strong>{plan.name}</strong><span>{plan.sponsorshipType} · R$ {asCurrency(plan.monthlyAmountCents)}/mês</span><div className="sponsor-benefit-tags">{plan.reservationCredits ? <span>{plan.reservationCredits} reserva(s) por ciclo</span> : null}{plan.lessonCredits ? <span>{plan.lessonCredits} aula(s) por ciclo</span> : null}{!plan.reservationCredits && !plan.lessonCredits ? <span>Sem saldo incluído</span> : null}</div></div>
        <section className="sponsor-company-list"><strong>Empresas · {plan.sponsors.length}</strong>{plan.sponsors.length ? plan.sponsors.map((sponsor) => <div className="sponsor-company-row" key={sponsor.id}>{sponsor.logoUrl ? <img src={sponsor.logoUrl} alt="" /> : <span>{sponsor.name.slice(0, 1)}</span>}<b>{sponsor.name}</b><SafeActionForm action={deleteTvSponsorAction}><input type="hidden" name="sponsorId" value={sponsor.id} /><SubmitButton label="Excluir" pendingLabel="..." className="button button-danger button-small sponsor-delete-button" /></SafeActionForm></div>) : <p className="muted">Ainda não há empresa vinculada.</p>}</section>
        <div className="active-event-actions"><Link href={`/proximos-jogos/patrocinios/${plan.id}`} className="button button-primary button-small">Entrar no plano</Link><SafeActionForm action={deleteSponsorshipPlanAction}><input type="hidden" name="planId" value={plan.id} /><SubmitButton label="Excluir plano" pendingLabel="Excluindo..." className="button button-secondary button-small" /></SafeActionForm></div>
      </article>)}
    </div> : <section className="sponsor-empty-state"><strong>Nenhum plano encontrado</strong><p>{query || type ? "Ajuste a pesquisa ou os filtros para localizar um plano." : "Crie um plano e inclua as empresas que fazem parte dele."}</p></section>}
  </div>;
}
