import { ArenaLegalLinks } from "@/components/legal/arena-legal-links";
import { LegalLayout } from "@/components/legal/legal-layout";
import Link from "next/link";
import { getPublicLegalArena } from "@/lib/legal/arena-context";
import { arenaDatabase } from "@/lib/arena-database";
export const dynamic = "force-dynamic";

export default async function CancellationPage({ params }: { params: Promise<{ arenaSlug: string }> }) {
  const { arenaSlug } = await params;
  const arena = await getPublicLegalArena(arenaSlug, "cancelamento");
  const settings = await arenaDatabase(arena.id).arenaOperationalSettings.findUnique({ where: { arenaId: arena.id }, select: { cancellationPolicy: true, cancellationPolicyPublished: true, cancellationPolicyUpdatedAt: true } });
  const published = settings?.cancellationPolicyPublished && settings.cancellationPolicy.trim();
  return <LegalLayout><Link href={`/classificacao/${encodeURIComponent(arena.slug)}`} className="tw:justify-self-start tw:rounded-lg tw:py-2 tw:text-sm">← Portal de {arena.name}</Link><header><p className="tw:text-xs tw:font-semibold tw:uppercase tw:tracking-wider tw:text-[var(--muted)]">{arena.name}</p><h1 className="tw:text-3xl tw:font-semibold">Cancelamento e reembolso</h1>{published && settings?.cancellationPolicyUpdatedAt ? <p className="tw:text-xs tw:text-[var(--muted)]">Atualizada em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "America/Sao_Paulo" }).format(settings.cancellationPolicyUpdatedAt)}</p> : null}</header>
    <article className="tw:rounded-2xl tw:border tw:border-[var(--line)] tw:bg-[var(--panel)] tw:p-5 tw:text-sm tw:leading-7">{published ? <p className="tw:m-0 tw:whitespace-pre-wrap tw:break-words">{settings.cancellationPolicy}</p> : <p className="tw:m-0">Esta arena ainda não publicou condições específicas de cancelamento. Consulte a equipe antes de contratar. Não há prazo padrão definido pelo sistema.</p>}<p className="tw:mb-0 tw:mt-5 tw:border-t tw:border-[var(--line)] tw:pt-4">Estas condições não afastam direitos previstos na legislação brasileira, inclusive o direito de arrependimento quando aplicável. Solicite cancelamento ou reembolso pelos canais da arena abaixo.</p></article>
    <footer className="tw:grid tw:gap-2 tw:break-words tw:text-sm tw:text-[var(--muted)]"><strong className="tw:text-[var(--text)]">Responsável: {arena.legalName || arena.name}</strong>{arena.cnpj ? <span>CNPJ: {arena.cnpj}</span> : null}{arena.address || arena.city ? <span>{[arena.address, arena.city, arena.state, arena.zipCode].filter(Boolean).join(" · ")}</span> : null}{arena.email ? <span>E-mail: {arena.email}</span> : null}{arena.phone ? <span>Telefone: {arena.phone}</span> : null}{!arena.email && !arena.phone ? <p>Os canais de atendimento ainda não foram informados pela arena.</p> : null}<ArenaLegalLinks arenaSlug={arena.slug}/></footer>
  </LegalLayout>;
}
