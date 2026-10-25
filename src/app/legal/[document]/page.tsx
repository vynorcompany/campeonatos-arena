import { LegalLayout } from "@/components/legal/legal-layout";
import Link from "next/link";
import { notFound } from "next/navigation";
import { legalDocumentSections, legalDocumentTitles, legalVersion, type LegalDocument } from "@/lib/legal/documents";
import { ArenaLegalLinks } from "@/components/legal/arena-legal-links";
export async function generateMetadata({ params }: { params: Promise<{ document: string }> }) {
  const { document } = await params;
  return { title: Object.hasOwn(legalDocumentTitles, document) ? `${legalDocumentTitles[document as LegalDocument]} · Portal do Atleta` : "Documento indisponível" };
}

export default async function GeneralLegalDocument({ params }: { params: Promise<{ document: string }> }) {
  const { document } = await params;
  if (!Object.hasOwn(legalDocumentTitles, document)) notFound();
  const kind = document as LegalDocument;
  return <LegalLayout><Link href="/portal" className="tw:justify-self-start tw:py-2 tw:text-sm">← Portal do Atleta</Link><header><h1 className="tw:text-3xl tw:font-semibold">{legalDocumentTitles[kind]}</h1><p className="tw:text-xs tw:text-[var(--muted)]">Versão {legalVersion}</p></header><p className="tw:rounded-xl tw:border tw:border-[var(--line)] tw:bg-[var(--panel)] tw:p-4 tw:text-sm tw:leading-relaxed">Os dados cadastrais, os canais de atendimento e as condições de cancelamento são próprios de cada arena. <Link href="/portal" className="tw:font-semibold tw:underline">Selecione sua arena</Link> para consultar essas informações.</p><article className="tw:grid tw:gap-6 tw:rounded-2xl tw:border tw:border-[var(--line)] tw:bg-[var(--panel)] tw:p-5 tw:text-sm tw:leading-7">{legalDocumentSections(kind, "sua arena").map(section => <section key={section.title}><h2 className="tw:mt-0 tw:mb-2 tw:text-base tw:font-semibold">{section.title}</h2><p className="tw:m-0">{section.text}</p></section>)}</article><footer className="tw:text-[var(--muted)]"><ArenaLegalLinks/></footer></LegalLayout>;
}
