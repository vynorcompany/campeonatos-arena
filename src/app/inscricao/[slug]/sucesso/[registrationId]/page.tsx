import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { arenaDatabase } from "@/lib/arena-database";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function RegistrationSuccessPage(props: { params: Promise<{ slug: string; registrationId: string }> }) {
  const params = await props.params;
  const tournament = await prisma.tournament.findUnique({ where: { publicSlug: params.slug }, select: { id: true, arenaId: true } });
  if (!tournament) notFound();
  const registration = await arenaDatabase(tournament.arenaId).publicTournamentRegistration.findFirst({
    where: { id: params.registrationId, tournamentId: tournament.id },
    include: { tournament: { include: { arena: { select: { name: true, logoUrl: true } } } }, category: { select: { name: true } } },
  });
  if (!registration) notFound();
  const confirmed = registration.status === "CONFIRMED" || registration.paymentStatus === "PAID";
  const needsReview = registration.paymentStatus === "REVIEW";
  const canceled = registration.status === "CANCELED" || registration.paymentStatus === "REFUNDED";

  return <main className={viewStyles.public_reg_success_page}>
    <section className={viewStyles.public_reg_success_card}>
      <p className={viewStyles.eyebrow}>{canceled ? "INSCRIÇÃO CANCELADA" : confirmed ? "INSCRIÇÃO CONCLUÍDA" : needsReview ? "PAGAMENTO EM ANÁLISE" : "PAGAMENTO PENDENTE"}</p>
      <h1>{canceled ? "Esta inscrição foi cancelada" : confirmed ? "Inscrição concluída com sucesso!" : needsReview ? "Estamos conferindo seu pagamento" : "Sua vaga está aguardando pagamento"}</h1>
      <p>{canceled ? "O pagamento anterior foi estornado ou cancelado. Para participar, faça uma nova inscrição." : confirmed ? "A dupla já está confirmada no torneio." : needsReview ? "A arena verificará o pagamento antes de confirmar a inscrição. Não faça outro pagamento agora." : "Conclua o pagamento para confirmar automaticamente a inscrição da dupla."}</p>
      <div className={viewStyles.public_reg_success_summary}>
        <div><span>Torneio</span><strong>{registration.tournament.name}</strong></div>
        <div><span>Categoria</span><strong>{registration.category.name}</strong></div>
        <div><span>Dupla</span><strong>{registration.leadName} / {registration.partnerName}</strong></div>
        <div><span>Valor</span><strong>{money.format(registration.amountCents / 100)}</strong></div>
        {registration.discountCents ? <div><span>Desconto aplicado</span><strong>{money.format(registration.discountCents / 100)}</strong></div> : null}
        <div><span>Status</span><strong className={cx(confirmed ? viewStyles.status_confirmed : viewStyles.status_pending)}>{canceled ? "Cancelada após estorno" : confirmed ? "Confirmada" : needsReview ? "Em análise" : "Pagamento pendente"}</strong></div>
      </div>
      {!canceled && !confirmed && !needsReview && registration.paymentCheckoutUrl ? <a className={viewStyles.button_button_primary} href={registration.paymentCheckoutUrl} target="_blank" rel="noreferrer">Pagar agora</a> : null}
      <Link className={viewStyles.button} href={`/inscricao/${params.slug}`}>Voltar para o torneio</Link>
    </section>
  </main>;
}
