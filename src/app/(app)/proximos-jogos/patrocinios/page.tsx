
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
  props: { searchParams?: Promise<{ q?: string; type?: string; sort?: string; kind?: string }> }
) {
  const searchParams = await props.searchParams;
  const auth = await requireModuleView("tv");
  const db = arenaDatabase(auth.arenaId);
  const query = String(searchParams?.q ?? "").trim();
  const type = String(searchParams?.type ?? "").trim();
  const kind = ["FIXED_COURT", "SPONSORSHIP"].includes(searchParams?.kind ?? "") ? searchParams!.kind! : "";
  const sort = String(searchParams?.sort ?? "name");
  const [plans, planTypeRows, courts] = await Promise.all([
    db.sponsorshipPlan.findMany({ where: { arenaId: auth.arenaId, ...(kind ? {kind} : {}), ...(query ? { name: { contains: query, mode: "insensitive" } } : {}), ...(type ? { sponsorshipType: type } : {}) }, include: { bookingSeries: { where:{ status:"ACTIVE" },select:{ id:true,responsiblePlayerId:true,fixedPlanEnrollmentId:true } }, sponsors: { orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] } }, orderBy: { createdAt: "asc" } }),
    db.sponsorshipPlan.findMany({ where: { arenaId: auth.arenaId }, select: { sponsorshipType: true }, distinct: ["sponsorshipType"] }),
    db.court.findMany({where:{arenaId:auth.arenaId,active:true},select:{id:true,name:true},orderBy:{name:"asc"}})
  ]);
  const linkCount = (plan: typeof plans[number]) => plan.kind === "FIXED_COURT" ? new Set(plan.bookingSeries.map(row=>row.responsiblePlayerId ?? row.fixedPlanEnrollmentId ?? row.id)).size : plan.sponsors.length;
  const orderedPlans = [...plans].sort((first, second) => sort === "value" ? second.monthlyAmountCents - first.monthlyAmountCents : sort === "companies" ? linkCount(second) - linkCount(first) : first.name.localeCompare(second.name, "pt-BR"));
  const planTypes = planTypeRows.map((plan) => plan.sponsorshipType).sort((first, second) => first.localeCompare(second, "pt-BR"));

  const columns = "tw:grid-cols-[minmax(180px,1fr)_150px_minmax(150px,1fr)_80px_auto] tw:viewport-1120:grid-cols-[minmax(0,1fr)_auto]";
  return <div className={ui.page}>
    <WorkspaceHeading title="Planos"><CreateSponsorshipPlanButton action={createSponsorshipPlanAction} courts={courts} /></WorkspaceHeading>
    <div className="tw:[&_input]:h-8! tw:[&_input]:min-h-8! tw:[&_select]:h-8! tw:[&_select]:min-h-8! tw:[&_form]:gap-2! tw:[&_label]:text-xs!"><SponsorshipFilters kind={kind} query={query} type={type} sort={sort} planTypes={planTypes} /></div>
    <div className={ui.list}><div className={`${ui.head} ${columns}`}><span>Plano</span><span>Mensalidade</span><span>Benefícios por ciclo</span><span>Vínculos</span><span>Ações</span></div>
    <>{orderedPlans.map(plan => <article className={`${ui.row} ${columns}`} key={plan.id}>
      <div><strong>{plan.name}</strong><small>{plan.kind==="FIXED_COURT" ? "Reserva fixa de quadra" : plan.sponsorshipType}</small></div>
      <span className="tw:text-[13px] tw:font-semibold tw:tabular-nums">R$ {asCurrency(plan.monthlyAmountCents)}<small className="tw:font-normal">por mês</small></span>
      {plan.kind==="FIXED_COURT"?<div className="tw:grid tw:gap-1 tw:text-xs"><span className="tw:text-[#174983]">{plan.reservationCredits ? `${plan.reservationCredits} créditos de reserva/ciclo` : "Créditos conforme os horários do ciclo"}</span><small>Quadra e horários por cliente</small><small>{plan.prorateFifthWeek?"Proporcional nos meses com cinco semanas":"Mensalidade fixa"}</small></div>:<div className="tw:flex tw:flex-wrap tw:gap-1 tw:text-[11px]">{plan.reservationCredits ? <span>{plan.reservationCredits} reservas</span> : null}{plan.lessonCredits ? <span>{plan.reservationCredits ? "· " : ""}{plan.lessonCredits} aulas</span> : null}{!plan.reservationCredits && !plan.lessonCredits ? <span className="tw:inline-flex tw:rounded tw:bg-white tw:border tw:border-[var(--line)] tw:px-1.5 tw:py-0.5 tw:text-[var(--muted)]">Sem saldo incluído</span> : null}</div>}
      <span className="tw:text-xs tw:text-[var(--muted)]">{plan.kind==="FIXED_COURT" ? `${linkCount(plan)} cliente(s)` : `${plan.sponsors.length} empresa(s)`}</span>
      <div className="tw:flex tw:flex-wrap tw:gap-2 tw:viewport-1120:col-span-full"><Link href={`/proximos-jogos/patrocinios/${plan.id}`} className={ui.secondary}>Abrir plano</Link><SafeActionForm action={deleteSponsorshipPlanAction} confirmKeyword="EXCLUIR" confirmPrompt={`Excluir o plano ${plan.name}? Digite EXCLUIR para confirmar.`}><input type="hidden" name="planId" value={plan.id} /><SubmitButton label="Excluir" pendingLabel="Excluindo..." className={ui.danger} /></SafeActionForm></div>
    </article>)}{!orderedPlans.length ? <p className={ui.empty}>Nenhum plano encontrado. Ajuste os filtros ou cadastre um plano.</p> : null}</></div>
  </div>;
}
