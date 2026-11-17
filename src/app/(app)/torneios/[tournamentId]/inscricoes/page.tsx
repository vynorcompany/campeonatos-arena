import { tournamentWorkspace as ui } from "@/components/tournaments/tournament-workspace";
import { TournamentRegistrationRow } from "@/components/tournaments/tournament-registration-row";
import { ReceiveOnsiteRegistrationButton } from "@/components/tournaments/receive-onsite-registration-button";

import { SmartEntitySelect } from "@/components/forms/smart-entity-select";
import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RegistrationEditForm, RegistrationPaymentFields } from "@/components/tournaments/registration-edit-form";
import { requireModuleView } from "@/lib/auth/guards";
import { arenaDatabase } from "@/lib/arena-database";
import { SubmitButton } from "@/components/forms/submit-button";
import { ReviewedCheckoutRelease } from "@/components/finance/reviewed-checkout-release";
import { canPerformPermission } from "@/lib/permissions";
import { canEditManualTournamentRegistration } from "@/lib/tournaments/registration-deletion";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function TournamentRegistrationsPage(
  props: { params: Promise<{ tournamentId: string }>; searchParams?: Promise<{ q?: string; category?: string; status?: string }> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const auth = await requireModuleView("tournaments");
  if (!canPerformPermission("tournaments:manage", auth.arenaRole, auth.systemRole, auth.editPermissions)) redirect(`/jogos?tournamentId=${encodeURIComponent(params.tournamentId)}`);
  const tournament = await arenaDatabase(auth.arenaId).tournament.findFirst({
    where: { id: params.tournamentId, arenaId: auth.arenaId },
    include: { categories: { orderBy: { level: "asc" }, select: { id: true, name: true, registrationType: true, competition: { select: { format: true } } } }, publicRegistrations: { orderBy: { createdAt: "asc" }, include: { category: { select: { id: true, name: true, registrationType: true, competition: { select: { format: true } } } } } } },
  });
  if (!tournament) notFound();
  const bankAccounts = await arenaDatabase(auth.arenaId).bankAccount.findMany({ where: { arenaId: auth.arenaId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  const q = (searchParams?.q ?? "").trim().toLowerCase();
  const registrations = tournament.publicRegistrations.filter((item) => {
    if (q && !`${item.leadName} ${item.partnerName} ${item.thirdName}`.toLowerCase().includes(q)) return false;
    if (searchParams?.category && item.categoryId !== searchParams.category) return false;
    if (searchParams?.status === "CONFIRMED") return item.status === "CONFIRMED";
    if (searchParams?.status === "REVIEW") return item.paymentStatus === "REVIEW";
    if (searchParams?.status === "CANCELED") return item.status === "CANCELED";
    if (searchParams?.status === "PENDING") return item.paymentStatus !== "REVIEW" && (item.status === "PENDING_PAYMENT" || (item.paymentProvider === "PAY_ON_SITE" && item.status === "CONFIRMED" && item.paymentStatus === "PENDING"));
    return true;
  });
  const canResolveReview = canPerformPermission("tournaments:manage", auth.arenaRole, auth.systemRole, auth.editPermissions);

  return <main className="tw:grid tw:w-full tw:min-w-0 tw:max-w-none tw:gap-3">
    <header className="tw:flex tw:min-w-0 tw:flex-wrap tw:items-center tw:justify-end tw:gap-2"><h1 className="tw:sr-only">Inscrições</h1><Link href={`/torneios/${tournament.id}`} className={ui.primary}>Voltar ao torneio</Link></header>
    <section className="tw:min-w-0">
      <form method="get" className="tw:mb-3 tw:grid tw:min-w-0 tw:grid-cols-[minmax(200px,300px)_minmax(140px,220px)_minmax(140px,200px)_auto] tw:items-end tw:justify-start tw:gap-2 tw:[&_:is(input,select)]:min-h-8! tw:[&_:is(input,select)]:rounded-md tw:[&_:is(input,select)]:border tw:[&_:is(input,select)]:border-[#bccbde] tw:[&_:is(input,select)]:bg-white tw:[&_:is(input,select)]:px-2 tw:[&_:is(input,select)]:py-1.5 tw:[&_:is(input,select)]:text-xs tw:[&_:is(input,select)]:text-[#202c3c] tw:viewport-760:grid-cols-2 tw:viewport-480:grid-cols-1">
        <label className="tw:grid tw:min-w-0 tw:gap-1 tw:text-xs tw:text-[#354f70]">Participante<input aria-label="Buscar atleta ou equipe" name="q" defaultValue={searchParams?.q} placeholder="Nome do atleta ou equipe"/></label>
        <div className="tw:grid tw:min-w-0 tw:gap-1 tw:text-xs tw:text-[#354f70]"><label htmlFor="registration-category-filter">Categoria</label><SmartEntitySelect id="registration-category-filter" createKind="tournament-category" contextId={tournament.id} label="Categoria" name="category" defaultValue={searchParams?.category ?? ""}><option value="">Todas as categorias</option>{tournament.categories.map(category=><option value={category.id} key={category.id}>{category.name}</option>)}</SmartEntitySelect></div>
        <label className="tw:grid tw:min-w-0 tw:gap-1 tw:text-xs tw:text-[#354f70]">Situação<select name="status" defaultValue={searchParams?.status ?? ""}><option value="">Todos os status</option><option value="PENDING">Pagamento pendente</option><option value="REVIEW">Em análise</option><option value="CONFIRMED">Confirmadas</option><option value="CANCELED">Canceladas</option></select></label>
        <button className="tw:min-h-8 tw:w-fit tw:rounded tw:border-0 tw:bg-[#215da5] tw:px-3 tw:py-1.5 tw:text-xs tw:font-normal tw:text-white tw:hover:bg-[#174983]" type="submit">Filtrar</button>
      </form>
      <div className="tw:min-w-0 tw:overflow-visible tw:rounded-md tw:border tw:border-[#cbd9e9]"><table className="tw:w-full tw:table-fixed tw:border-collapse tw:text-left tw:viewport-760:block"><colgroup className="tw:viewport-760:hidden"><col className="tw:w-[38%]"/><col className="tw:w-[13%]"/><col className="tw:w-[14%]"/><col className="tw:w-[20%]"/><col className="tw:w-[15%]"/></colgroup><thead className="tw:bg-[#174983] tw:text-xs tw:font-normal tw:text-white tw:viewport-760:hidden"><tr className="tw:[&>th]:px-3 tw:[&>th]:py-2 tw:[&>th]:font-normal"><th>Participante / Categoria</th><th>Valor</th><th>Situação</th><th>Pagamento</th><th className="tw:text-right">Ações</th></tr></thead><tbody className="tw:viewport-760:block">

        {registrations.length ? registrations.map((registration) => {
          const underReview = registration.paymentStatus === "REVIEW";
          const canceled = registration.status === "CANCELED" || registration.paymentStatus === "REFUNDED";
          const confirmed = registration.status === "CONFIRMED";
          const canReceiveOnsite = registration.paymentProvider === "PAY_ON_SITE" && confirmed && registration.paymentStatus === "PENDING" && canPerformPermission("finance:receivable:settle", auth.arenaRole, auth.systemRole, auth.editPermissions);
          return <TournamentRegistrationRow key={registration.id} name={[registration.leadName, registration.partnerName, registration.thirdName].filter(Boolean).join(" / ")} category={registration.category.name} amount={money.format(registration.amountCents / 100)} canceled={canceled} pending={registration.paymentStatus === "PENDING" || underReview} situation={canceled ? "Cancelada" : confirmed ? "Confirmada" : "Pendente"} payment={underReview ? "Em análise" : registration.paymentStatus === "REFUNDED" ? "Estornado" : registration.paymentStatus === "PAID" ? "Pago" : canceled ? "Cancelado" : registration.paymentProvider === "PAY_ON_SITE" ? "Pagamento no local" : "Pagamento pendente"} actions={canReceiveOnsite ? <ReceiveOnsiteRegistrationButton registrationId={registration.id} accounts={bankAccounts}/> : null}>
            {underReview ? <ReviewedCheckoutRelease kind="registration" recordId={registration.id} paymentId={registration.mercadoPagoPaymentId} clientName={`${registration.leadName} / ${registration.partnerName}`} canResolve={canResolveReview} /> : canceled ? <p className={viewStyles.muted}>Pagamento estornado ou cancelado. É possível fazer uma nova inscrição.</p> : registration.paymentProvider === "PAY_ON_SITE" || !canEditManualTournamentRegistration(registration) ? <p className={viewStyles.muted}>{confirmed ? "Inscrição confirmada: correções devem preservar seus vínculos com o evento." : "Inscrição com cobrança online: confira o pagamento antes de alterar os dados."}</p> :
              <RegistrationEditForm className={viewStyles.tournament_registration_edit}>
                <input type="hidden" name="registrationId" value={registration.id} /><input type="hidden" name="registrationType" value={registration.category.registrationType}/><input type="hidden" name="tournamentId" value={tournament.id} />
                <label>Categoria<SmartEntitySelect label="Categoria" name="categoryId" defaultValue={registration.categoryId}>{tournament.categories.filter(category => category.registrationType === registration.category.registrationType && (category.competition?.format === "TRIO") === (registration.category.competition?.format === "TRIO")).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</SmartEntitySelect></label>
                <label>Atleta 1<input name="leadName" defaultValue={registration.leadName} required /></label>
                <label>Telefone<input name="leadPhone" defaultValue={registration.leadPhone} required /></label>
                <label>CPF<input name="leadCpf" defaultValue={registration.leadCpf} required /></label>
                <label>Nascimento (opcional)<input name="leadBirthDate" type="date" defaultValue={registration.leadBirthDate?.toISOString().slice(0, 10) ?? ""} /></label>
                {registration.category.registrationType !== "INDIVIDUAL" ? <>
                <label>Atleta 2<input name="partnerName" defaultValue={registration.partnerName} required /></label>
                <label>Telefone<input name="partnerPhone" defaultValue={registration.partnerPhone} required /></label>
                <label>CPF<input name="partnerCpf" defaultValue={registration.partnerCpf} required /></label>
                <label>Nascimento (opcional)<input name="partnerBirthDate" type="date" defaultValue={registration.partnerBirthDate?.toISOString().slice(0, 10) ?? ""} /></label>
                </> : null}
                {registration.category.competition?.format === "TRIO" ? <><label>Atleta 3<input name="thirdName" defaultValue={registration.thirdName} required /></label><label>Telefone<input name="thirdPhone" defaultValue={registration.thirdPhone} required /></label><label>CPF<input name="thirdCpf" defaultValue={registration.thirdCpf} required /></label><label>Nascimento (opcional)<input name="thirdBirthDate" type="date" defaultValue={registration.thirdBirthDate?.toISOString().slice(0,10) ?? ""} /></label></> : null}
                <RegistrationPaymentFields amountCents={registration.amountCents} accounts={bankAccounts} />
                <SubmitButton label="Salvar alterações" pendingLabel="Salvando..." className={viewStyles.button_button_primary} />
              </RegistrationEditForm>}
          </TournamentRegistrationRow>;
        }) : <tr><td colSpan={5} className="tw:p-4 tw:text-sm tw:text-[#465c75]">Nenhuma inscrição corresponde aos filtros.</td></tr>}
      </tbody></table></div>
    </section>
  </main>;
}
