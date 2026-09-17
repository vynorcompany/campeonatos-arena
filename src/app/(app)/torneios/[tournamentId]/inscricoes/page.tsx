import Link from "next/link";
import { updateTournamentRegistrationAction } from "@/lib/actions/tournament";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { SubmitButton } from "@/components/forms/submit-button";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function TournamentRegistrationsPage(
  props: { params: Promise<{ tournamentId: string }>; searchParams?: Promise<{ q?: string; category?: string; status?: string }> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const auth = await requireModuleView("tournaments");
  const tournament = await prisma.tournament.findFirst({
    where: { id: params.tournamentId, arenaId: auth.arenaId },
    include: { categories: { orderBy: { level: "asc" }, select: { id: true, name: true } }, publicRegistrations: { orderBy: { createdAt: "asc" }, include: { category: { select: { id: true, name: true } } } } },
  });
  if (!tournament) return null;
  const q = (searchParams?.q ?? "").trim().toLowerCase();
  const registrations = tournament.publicRegistrations.filter((item) => (!q || `${item.leadName} ${item.partnerName}`.toLowerCase().includes(q)) && (!searchParams?.category || item.categoryId === searchParams.category) && (!searchParams?.status || (searchParams.status === "CONFIRMED" ? item.status === "CONFIRMED" : item.status !== "CONFIRMED")));

  return <main className="tournament-management-page stack-md">
    <header className="page-header tournament-management-header"><div><p className="eyebrow">Torneio</p><h1>Inscrições</h1><p className="muted">{tournament.name} · lista única por ordem de inscrição.</p></div><Link href={`/torneios/${tournament.id}`} className="button">Voltar ao torneio</Link></header>
    <section className="section-card">
      <form className="tournament-registration-filters" method="get"><input name="q" defaultValue={searchParams?.q} placeholder="Buscar atleta ou dupla" /><select name="category" defaultValue={searchParams?.category ?? ""}><option value="">Todas as categorias</option>{tournament.categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select><select name="status" defaultValue={searchParams?.status ?? ""}><option value="">Todos os status</option><option value="PENDING">Pagamento pendente</option><option value="CONFIRMED">Confirmadas</option></select><button className="button" type="submit">Filtrar</button></form>
      <div className="tournament-registration-list">{registrations.length ? registrations.map((registration, index) => <details key={registration.id} className="tournament-registration-row"><summary><span className="registration-order">{index + 1}</span><div><strong>{registration.leadName} / {registration.partnerName}</strong><small>{registration.category.name}</small></div><span>{money.format(registration.amountCents / 100)}</span><span className={registration.status === "CONFIRMED" ? "status-confirmed" : "status-pending"}>{registration.status === "CONFIRMED" ? "Confirmada" : "Pagamento pendente"}</span></summary><form action={updateTournamentRegistrationAction} className="tournament-registration-edit"><input type="hidden" name="registrationId" value={registration.id} /><input type="hidden" name="tournamentId" value={tournament.id} /><label>Categoria<select name="categoryId" defaultValue={registration.categoryId}>{tournament.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Atleta 1<input name="leadName" defaultValue={registration.leadName} required /></label><label>Telefone<input name="leadPhone" defaultValue={registration.leadPhone} required /></label><label>CPF<input name="leadCpf" defaultValue={registration.leadCpf} required /></label><label>Nascimento<input name="leadBirthDate" type="date" defaultValue={registration.leadBirthDate.toISOString().slice(0, 10)} required /></label><label>Atleta 2<input name="partnerName" defaultValue={registration.partnerName} required /></label><label>Telefone<input name="partnerPhone" defaultValue={registration.partnerPhone} required /></label><label>CPF<input name="partnerCpf" defaultValue={registration.partnerCpf} required /></label><label>Nascimento<input name="partnerBirthDate" type="date" defaultValue={registration.partnerBirthDate.toISOString().slice(0, 10)} required /></label><label>Valor (R$)<input name="amountReais" inputMode="decimal" defaultValue={(registration.amountCents / 100).toFixed(2).replace(".", ",")} /></label><label>Status<select name="paymentStatus" defaultValue={registration.paymentStatus === "PAID" ? "PAID" : "PENDING"}><option value="PENDING">Pagamento pendente</option><option value="PAID">Pago / confirmar</option></select></label><SubmitButton label="Salvar alterações" pendingLabel="Salvando..." className="button button-primary" /></form></details>) : <p className="muted">Nenhuma inscrição corresponde aos filtros.</p>}</div>
    </section>
  </main>;
}
