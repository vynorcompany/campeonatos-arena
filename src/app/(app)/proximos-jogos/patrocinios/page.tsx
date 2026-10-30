import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
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

  const columns = "tw:grid-cols-[minmax(180px,1fr)_150px_minmax(150px,1fr)_80px_auto] tw:viewport-1120:grid-cols-[minmax(0,1fr)_auto]";
  return <div className={ui.page}>
    <WorkspaceHeading title="Patrocínios"><CreateSponsorshipPlanButton action={createSponsorshipPlanAction} /></WorkspaceHeading>
    <div className="tw:[&_input]:h-9! tw:[&_input]:min-h-9! tw:[&_select]:h-9! tw:[&_select]:min-h-9! tw:[&_form]:gap-2! tw:[&_label]:text-xs!"><SponsorshipFilters query={query} type={type} sort={sort} planTypes={planTypes} /></div>
    <div className={ui.list}><div className={`${ui.head} ${columns}`}><span>Plano</span><span>Mensalidade</span><span>Benefícios por ciclo</span><span>Empresas</span><span>Ações</span></div>
    {orderedPlans.map(plan => <article className={`${ui.row} ${columns}`} key={plan.id}>
      <div><strong>{plan.name}</strong><small>{plan.sponsorshipType}</small></div>
      <span className="tw:text-[13px] tw:font-semibold tw:tabular-nums">R$ {asCurrency(plan.monthlyAmountCents)}<small className="tw:font-normal">por mês</small></span>
      <div className="tw:flex tw:flex-wrap tw:gap-1 tw:text-[11px]">{plan.reservationCredits ? <span>{plan.reservationCredits} reservas</span> : null}{plan.lessonCredits ? <span>{plan.reservationCredits ? "· " : ""}{plan.lessonCredits} aulas</span> : null}{!plan.reservationCredits && !plan.lessonCredits ? <span className="tw:inline-flex tw:rounded tw:bg-white tw:border tw:border-[var(--line)] tw:px-1.5 tw:py-0.5 tw:text-[var(--muted)]">Sem saldo incluído</span> : null}</div>
      <span className="tw:text-xs tw:text-[var(--muted)]">{plan.sponsors.length} empresa{plan.sponsors.length === 1 ? "" : "s"}</span>
      <div className="tw:flex tw:flex-wrap tw:gap-2 tw:viewport-1120:col-span-full"><Link href={`/proximos-jogos/patrocinios/${plan.id}`} className={ui.secondary}>Abrir plano</Link><SafeActionForm action={deleteSponsorshipPlanAction} confirmKeyword="EXCLUIR" confirmPrompt={`Excluir o plano ${plan.name}? Digite EXCLUIR para confirmar.`}><input type="hidden" name="planId" value={plan.id} /><SubmitButton label="Excluir" pendingLabel="Excluindo..." className={ui.secondary} /></SafeActionForm></div>
    </article>)}{!orderedPlans.length ? <p className={ui.empty}>Nenhum plano encontrado. Ajuste os filtros ou cadastre um plano.</p> : null}</div>
  </div>;
}
