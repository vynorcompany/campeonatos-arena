import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export default async function RegistrationSuccessPage({ params }: { params: { slug: string; registrationId: string } }) {
  const registration = await prisma.publicTournamentRegistration.findFirst({
    where: { id: params.registrationId, tournament: { publicSlug: params.slug } },
    include: { tournament: { include: { arena: { select: { name: true, logoUrl: true } } } }, category: { select: { name: true } } },
  });
  if (!registration) notFound();
  const confirmed = registration.status === "CONFIRMED" || registration.paymentStatus === "PAID";

  return <main className="public-reg-success-page">
    <section className="public-reg-success-card">
      <p className="eyebrow">{confirmed ? "INSCRIÇÃO CONCLUÍDA" : "PAGAMENTO PENDENTE"}</p>
      <h1>{confirmed ? "Inscrição concluída com sucesso!" : "Sua vaga está aguardando pagamento"}</h1>
      <p>{confirmed ? "A dupla já está confirmada no torneio." : "Conclua o pagamento para confirmar automaticamente a inscrição da dupla."}</p>
      <div className="public-reg-success-summary">
        <div><span>Torneio</span><strong>{registration.tournament.name}</strong></div>
        <div><span>Categoria</span><strong>{registration.category.name}</strong></div>
        <div><span>Dupla</span><strong>{registration.leadName} / {registration.partnerName}</strong></div>
        <div><span>Valor</span><strong>{money.format(registration.amountCents / 100)}</strong></div>
        {registration.discountCents ? <div><span>Desconto aplicado</span><strong>{money.format(registration.discountCents / 100)}</strong></div> : null}
        <div><span>Status</span><strong className={confirmed ? "status-confirmed" : "status-pending"}>{confirmed ? "Confirmada" : "Pagamento pendente"}</strong></div>
      </div>
      {!confirmed && registration.paymentCheckoutUrl ? <a className="button button-primary" href={registration.paymentCheckoutUrl} target="_blank" rel="noreferrer">Pagar agora</a> : null}
      <Link className="button" href={`/inscricao/${params.slug}`}>Voltar para o torneio</Link>
    </section>
  </main>;
}
