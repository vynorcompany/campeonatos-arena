import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RegistrationEditForm } from "@/components/tournaments/registration-edit-form";
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
    include: { categories: { orderBy: { level: "asc" }, select: { id: true, name: true } }, publicRegistrations: { orderBy: { createdAt: "asc" }, include: { category: { select: { id: true, name: true } } } } },
  });
  if (!tournament) notFound();
  const q = (searchParams?.q ?? "").trim().toLowerCase();
  const registrations = tournament.publicRegistrations.filter((item) => {
    if (q && !`${item.leadName} ${item.partnerName}`.toLowerCase().includes(q)) return false;
    if (searchParams?.category && item.categoryId !== searchParams.category) return false;
    if (searchParams?.status === "CONFIRMED") return item.status === "CONFIRMED";
    if (searchParams?.status === "REVIEW") return item.paymentStatus === "REVIEW";
    if (searchParams?.status === "CANCELED") return item.status === "CANCELED";
    if (searchParams?.status === "PENDING") return item.status === "PENDING_PAYMENT" && item.paymentStatus !== "REVIEW";
    return true;
  });
  const canResolveReview = canPerformPermission("tournaments:manage", auth.arenaRole, auth.systemRole, auth.editPermissions);

  return <main className={viewStyles.tournament_management_page_stack_md}>
    <header className={viewStyles.page_header_tournament_management_header}><div><p className={viewStyles.eyebrow}>Torneio</p><h1>Inscrições</h1><p className={viewStyles.muted}>{tournament.name} · lista única por ordem de inscrição.</p></div><Link href={`/torneios/${tournament.id}`} className={viewStyles.button}>Voltar ao torneio</Link></header>
    <section className={viewStyles.section_card}>
      <form className={viewStyles.tournament_registration_filters} method="get">
        <input name="q" defaultValue={searchParams?.q} placeholder="Buscar atleta ou dupla" />
        <select name="category" defaultValue={searchParams?.category ?? ""}><option value="">Todas as categorias</option>{tournament.categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select>
        <select name="status" defaultValue={searchParams?.status ?? ""}><option value="">Todos os status</option><option value="PENDING">Pagamento pendente</option><option value="REVIEW">Em análise</option><option value="CONFIRMED">Confirmadas</option><option value="CANCELED">Canceladas</option></select>
        <button className={viewStyles.button} type="submit">Filtrar</button>
      </form>
      <div className={viewStyles.tournament_registration_list}>
        {registrations.length ? registrations.map((registration, index) => {
          const underReview = registration.paymentStatus === "REVIEW";
          const canceled = registration.status === "CANCELED" || registration.paymentStatus === "REFUNDED";
          const confirmed = registration.status === "CONFIRMED";
          return <details key={registration.id} className={viewStyles.tournament_registration_row}>
            <summary><span className={viewStyles.registration_order}>{index + 1}</span><div><strong>{registration.leadName} / {registration.partnerName}</strong><small>{registration.category.name}</small></div><span>{money.format(registration.amountCents / 100)}</span><span className={cx(confirmed ? viewStyles.status_confirmed : viewStyles.status_pending)}>{underReview ? "Pagamento em análise" : canceled ? registration.paymentStatus === "REFUNDED" ? "Cancelada após estorno" : "Cancelada" : confirmed ? "Confirmada" : "Pagamento pendente"}</span></summary>
            {underReview ? <ReviewedCheckoutRelease kind="registration" recordId={registration.id} paymentId={registration.mercadoPagoPaymentId} clientName={`${registration.leadName} / ${registration.partnerName}`} canResolve={canResolveReview} /> : canceled ? <p className={viewStyles.muted}>Pagamento estornado ou cancelado. A dupla pode fazer uma nova inscrição.</p> : !canEditManualTournamentRegistration(registration) ? <p className={viewStyles.muted}>{confirmed ? "Dupla confirmada: correções devem preservar seus vínculos com os jogos." : "Inscrição com cobrança online: confira o pagamento antes de alterar os dados."}</p> :
              <RegistrationEditForm className={viewStyles.tournament_registration_edit}>
                <input type="hidden" name="registrationId" value={registration.id} /><input type="hidden" name="tournamentId" value={tournament.id} />
                <label>Categoria<select name="categoryId" defaultValue={registration.categoryId}>{tournament.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
                <label>Atleta 1<input name="leadName" defaultValue={registration.leadName} required /></label>
                <label>Telefone<input name="leadPhone" defaultValue={registration.leadPhone} required /></label>
                <label>CPF<input name="leadCpf" defaultValue={registration.leadCpf} required /></label>
                <label>Nascimento<input name="leadBirthDate" type="date" defaultValue={registration.leadBirthDate.toISOString().slice(0, 10)} required /></label>
                <label>Atleta 2<input name="partnerName" defaultValue={registration.partnerName} required /></label>
                <label>Telefone<input name="partnerPhone" defaultValue={registration.partnerPhone} required /></label>
                <label>CPF<input name="partnerCpf" defaultValue={registration.partnerCpf} required /></label>
                <label>Nascimento<input name="partnerBirthDate" type="date" defaultValue={registration.partnerBirthDate.toISOString().slice(0, 10)} required /></label>
                <label>Valor (R$)<input name="amountReais" inputMode="decimal" defaultValue={(registration.amountCents / 100).toFixed(2).replace(".", ",")} /></label>
                <label>Status<select name="paymentStatus" defaultValue={registration.paymentStatus === "PAID" ? "PAID" : "PENDING"}><option value="PENDING">Pagamento pendente</option><option value="PAID">Pago / confirmar</option></select></label>
                <SubmitButton label="Salvar alterações" pendingLabel="Salvando..." className={viewStyles.button_button_primary} />
              </RegistrationEditForm>}
          </details>;
        }) : <p className={viewStyles.muted}>Nenhuma inscrição corresponde aos filtros.</p>}
      </div>
    </section>
  </main>;
}
