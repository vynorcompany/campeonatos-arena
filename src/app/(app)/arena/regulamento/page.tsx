import { viewStyles } from "./page.utilities";
import { RegulationDocumentForm } from "@/components/forms/regulation-document-form";
import { SectionCard } from "@/components/section-card";
import { requireModuleEdit } from "@/lib/auth/guards";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

function buildPublicRegulationUrl(slug: string) {
  const baseUrl = env.appUrl ?? "http://localhost:3000";
  return new URL(`/regulamento/${slug}`, baseUrl).toString();
}

export default async function RegulationPage() {
  const auth = await requireModuleEdit("arena");
  const documents = await prisma.regulationDocument.findMany({
    where: {
      arenaId: auth.arenaId
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 10,
    include: {
      createdBy: {
        select: {
          name: true,
          email: true
        }
      },
      _count: {
        select: {
          acceptances: true
        }
      }
    }
  });

  const latestDocument = documents[0];
  const latestPublicUrl = latestDocument ? buildPublicRegulationUrl(latestDocument.publicSlug) : "";

  return (
    <div className={viewStyles.stack_md}>
      <header className={viewStyles.page_header}>
        <div className={viewStyles.stack_xs}>
          <p className={viewStyles.eyebrow}>Arena</p>
          <h1>Regulamento público</h1>
          <p className={viewStyles.muted}>
            Escreva os termos uma vez, publique o link e acompanhe os aceites feitos pelos clientes na página pública.
          </p>
        </div>
      </header>

      <div className={viewStyles.two_column_grid}>
        <SectionCard
          title="Novo regulamento"
          description="Publique uma nova versão. O sistema vai gerar um link público para compartilhar com o cliente."
        >
          <RegulationDocumentForm defaultContent={latestDocument?.content ?? ""} />
        </SectionCard>

        <SectionCard title="Último link público" description="Copie e compartilhe a versão ativa do regulamento.">
          {latestDocument ? (
            <div className={viewStyles.regulation_link_panel}>
              <strong>{latestDocument.createdBy?.name ?? "Sistema"}</strong>
              <p className={viewStyles.muted}>{formatDateTime(latestDocument.createdAt)}</p>
              <a className={viewStyles.regulation_link} href={latestPublicUrl} target="_blank" rel="noreferrer">
                {latestPublicUrl}
              </a>
              <p className={viewStyles.muted}>{latestDocument._count.acceptances} aceite(s) registrados.</p>
            </div>
          ) : (
            <p className={viewStyles.muted}>Nenhum regulamento publicado ainda.</p>
          )}

          <div className={viewStyles.regulation_history}>
            {documents.length ? (
              documents.map((document) => {
                const publicUrl = buildPublicRegulationUrl(document.publicSlug);

                return (
                  <article key={document.id} className={viewStyles.regulation_history_item}>
                    <div className={viewStyles.stack_xs}>
                      <strong>{formatDateTime(document.createdAt)}</strong>
                      <span className={viewStyles.muted}>
                        {document.createdBy?.name ?? "Sistema"}
                        {document.createdBy?.email ? ` · ${document.createdBy.email}` : ""}
                      </span>
                    </div>
                    <a className={viewStyles.regulation_link} href={publicUrl} target="_blank" rel="noreferrer">
                      {publicUrl}
                    </a>
                    <p className={viewStyles.regulation_history_content}>{document.content}</p>
                    <span className={viewStyles.muted}>{document._count.acceptances} aceite(s)</span>
                  </article>
                );
              })
            ) : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
