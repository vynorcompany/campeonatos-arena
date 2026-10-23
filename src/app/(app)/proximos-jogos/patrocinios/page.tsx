import { WorkspaceHeading } from "@/components/ui/workspace-heading";
import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { SponsorshipFilters } from "@/components/sponsorship/sponsorship-filters";
import { CreateSponsorshipPlanButton } from "@/components/sponsorship/sponsorship-plan-dialogs";
import { createSponsorshipPlanAction, deleteSponsorshipPlanAction, deleteTvSponsorAction } from "@/lib/actions/upcoming-match";
import { requireModuleView } from "@/lib/auth/guards";
import { arenaDatabase } from "@/lib/arena-database";

const asCurrency = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export default async function SponsorshipManagementPage(
  props: { searchParams?: Promise<{ q?: string; type?: string; sort?: string }> }
) {
  const searchParams = await props.searchParams;
  const auth = await requireModuleView("tv");
  const db = arenaDatabase(auth.arenaId);
  const query = String(searchParams?.q ?? "").trim();
  const type = String(searchParams?.type ?? "").trim();
  const sort = String(searchParams?.sort ?? "name");
  const [plans, planTypeRows] = await Promise.all([
    db.sponsorshipPlan.findMany({ where: { arenaId: auth.arenaId, ...(query ? { name: { contains: query, mode: "insensitive" } } : {}), ...(type ? { sponsorshipType: type } : {}) }, include: { sponsors: { orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] } }, orderBy: { createdAt: "asc" } }),
    db.sponsorshipPlan.findMany({ where: { arenaId: auth.arenaId }, select: { sponsorshipType: true }, distinct: ["sponsorshipType"] })
  ]);
  const orderedPlans = [...plans].sort((first, second) => sort === "value" ? second.monthlyAmountCents - first.monthlyAmountCents : sort === "companies" ? second.sponsors.length - first.sponsors.length : first.name.localeCompare(second.name, "pt-BR"));
  const planTypes = planTypeRows.map((plan) => plan.sponsorshipType).sort((first, second) => first.localeCompare(second, "pt-BR"));

  return <div className={viewStyles.stack_md_sponsorship_management_page}>
    <WorkspaceHeading eyebrow="PARCERIAS · PATROCÍNIOS" title="Marcas que jogam junto" description="Organize os planos, benefícios e empresas que fazem parte da arena." />
    <section className={viewStyles.sponsorship_management_toolbar}><SponsorshipFilters query={query} type={type} sort={sort} planTypes={planTypes} /><CreateSponsorshipPlanButton action={createSponsorshipPlanAction} /></section>
    {orderedPlans.length ? <div className={viewStyles.active_event_list_sponsor_plan_list}>
      {orderedPlans.map((plan) => <article className={viewStyles.active_event_row_sponsor_plan_row} key={plan.id}>
        <div className="tw:rounded-xl tw:bg-[#edf4ff] tw:p-4"><span className="tw:text-[10px]! tw:font-bold tw:uppercase tw:tracking-wider tw:text-[#0868e5]!">{plan.sponsorshipType || "Plano de patrocínio"}</span><strong className="tw:mt-1 tw:text-lg!">{plan.name}</strong><p className="tw:m-0 tw:my-3 tw:text-2xl tw:font-bold tw:tracking-tight tw:text-[#132d58]">R$ {asCurrency(plan.monthlyAmountCents)}<small className="tw:ml-1 tw:text-xs tw:font-normal tw:text-[#607898]">/mês</small></p><div className={viewStyles.sponsor_benefit_tags}>{plan.reservationCredits ? <span>{plan.reservationCredits} reserva(s) por ciclo</span> : null}{plan.lessonCredits ? <span>{plan.lessonCredits} aula(s) por ciclo</span> : null}{!plan.reservationCredits && !plan.lessonCredits ? <span>Sem saldo incluído</span> : null}</div></div>
        <section className={viewStyles.sponsor_company_list}><strong>Empresas · {plan.sponsors.length}</strong>{plan.sponsors.length ? plan.sponsors.map((sponsor) => <div className={viewStyles.sponsor_company_row} key={sponsor.id}>{sponsor.logoUrl ? <img src={sponsor.logoUrl} alt="" /> : <span>{sponsor.name.slice(0, 1)}</span>}<b>{sponsor.name}</b><SafeActionForm action={deleteTvSponsorAction} confirmKeyword="EXCLUIR" confirmPrompt={`Excluir o patrocinador ${sponsor.name}? Digite EXCLUIR para confirmar.`}><input type="hidden" name="sponsorId" value={sponsor.id} /><SubmitButton label="Excluir" pendingLabel="..." className={viewStyles.button_button_danger_button_small_sponsor_delete_button} /></SafeActionForm></div>) : <p className={viewStyles.muted}>Ainda não há empresa vinculada.</p>}</section>
        <div className={viewStyles.active_event_actions}><Link href={`/proximos-jogos/patrocinios/${plan.id}`} className={viewStyles.button_button_primary_button_small}>Entrar no plano</Link><SafeActionForm action={deleteSponsorshipPlanAction} confirmKeyword="EXCLUIR" confirmPrompt={`Excluir o plano ${plan.name}? Digite EXCLUIR para confirmar.`}><input type="hidden" name="planId" value={plan.id} /><SubmitButton label="Excluir plano" pendingLabel="Excluindo..." className={viewStyles.button_button_secondary_button_small} /></SafeActionForm></div>
      </article>)}
    </div> : <section className={viewStyles.sponsor_empty_state}><strong>Nenhum plano encontrado</strong><p>{query || type ? "Ajuste a pesquisa ou os filtros para localizar um plano." : "Crie um plano e inclua as empresas que fazem parte dele."}</p></section>}
  </div>;
}
