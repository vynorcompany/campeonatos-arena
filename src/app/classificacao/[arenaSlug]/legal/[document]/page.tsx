import { LegalLayout } from "@/components/legal/legal-layout";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicLegalArena } from "@/lib/legal/arena-context";
import { legalDocumentSections, legalDocumentTitles, legalVersion, type LegalDocument } from "@/lib/legal/documents";
import { ArenaLegalLinks } from "@/components/legal/arena-legal-links";
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ document: string }> }) {
  const { document } = await params;
  return { title: Object.hasOwn(legalDocumentTitles, document) ? `${legalDocumentTitles[document as LegalDocument]} · Portal do Atleta` : "Documento indisponível" };
}

export default async function ArenaLegalDocument({ params }: { params: Promise<{ arenaSlug: string; document: string }> }) {
  const { arenaSlug, document } = await params;
  if (!Object.hasOwn(legalDocumentTitles, document)) notFound();
  const arena = await getPublicLegalArena(arenaSlug, `legal/${document}`);
  const kind = document as LegalDocument;
  return <LegalLayout><Link href={`/classificacao/${encodeURIComponent(arena.slug)}`} className="tw:justify-self-start tw:rounded-lg tw:py-2 tw:text-sm">← Portal de {arena.name}</Link><header><p className="tw:text-xs tw:font-semibold tw:uppercase tw:tracking-wider tw:text-[var(--muted)]">{arena.name}</p><h1 className="tw:text-3xl tw:font-semibold">{legalDocumentTitles[kind]}</h1><p className="tw:text-xs tw:text-[var(--muted)]">Versão {legalVersion}</p></header>
    <article className="tw:grid tw:gap-6 tw:rounded-2xl tw:border tw:border-[var(--line)] tw:bg-[var(--panel)] tw:p-5 tw:text-sm tw:leading-7">{legalDocumentSections(kind, arena.name).map(section => <section key={section.title}><h2 className="tw:mt-0 tw:mb-2 tw:text-base tw:font-semibold">{section.title}</h2><p className="tw:m-0">{section.text}</p></section>)}</article>
    <section aria-label="Dados e atendimento da arena" className="tw:grid tw:gap-2 tw:break-words tw:rounded-2xl tw:border tw:border-[var(--line)] tw:p-5 tw:text-sm"><h2 className="tw:m-0 tw:text-base tw:font-semibold">Dados e atendimento</h2><strong>{arena.legalName || arena.name}</strong>{arena.cnpj ? <span>CNPJ: {arena.cnpj}</span> : null}{arena.address || arena.city ? <span>{[arena.address, arena.city, arena.state, arena.zipCode].filter(Boolean).join(" · ")}</span> : null}{arena.email ? <span>E-mail: {arena.email}</span> : null}{arena.phone ? <span>Telefone: {arena.phone}</span> : null}{!arena.email && !arena.phone ? <p className="tw:m-0">Os canais de atendimento ainda não foram informados pela arena. Solicite à recepção a identificação do responsável e o canal para exercer seus direitos.</p> : null}</section>
    <footer className="tw:grid tw:gap-4 tw:text-[var(--muted)]"><ArenaLegalLinks arenaSlug={arena.slug}/><p className="tw:m-0 tw:text-xs tw:leading-relaxed">Referências: <a href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm" className="tw:underline">LGPD</a>, <a href="https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm" className="tw:underline">Código de Defesa do Consumidor</a> e <a href="https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia_orientativo_cookies_e_protecao_de_dados_pessoais" className="tw:underline">guia de cookies da ANPD</a>.</p></footer>
  </LegalLayout>;
}
