import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./page.utilities";
import { requireAgencyAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import styles from "./page.styles";

export default async function AgencyConnectionsPage() {
  await requireAgencyAccess();
  const arenas = await prisma.arena.findMany({
    orderBy: { name: "asc" },
    include: { whatsappConnection: true }
  });

  return (
    <div className={cx(`${viewStyles.stack_md} ${styles.page}`)}>
      <header className={viewStyles.page_header}>
        <div>
          <p className={viewStyles.eyebrow}>INTEGRAÇÕES</p>
          <h1>Conexões das arenas</h1>
          <p className={viewStyles.muted}>Acompanhe as conexões isoladas. O QR Code e a conexão são configurados no painel de cada arena.</p>
        </div>
      </header>
      <section className={styles.list}>
        {arenas.map((arena) => {
          const connection = arena.whatsappConnection;
          const connected = connection?.status === "CONNECTED";
          return (
            <article key={arena.id} className={styles.card}>
              <header>
                <div>
                  <span className={cx(`${viewStyles.agency_connection_status} ${connected ? "is-connected" : ""}`)}><i />{connected ? "Conectado" : connection ? "Aguardando conexão" : "Não configurado"}</span>
                  <h2>{arena.name}</h2>
                  <p>{connected ? `WhatsApp ${connection?.connectedPhone || "conectado"}` : "Conecte o número de WhatsApp Business desta arena."}</p>
                </div>
                {connection ? <code>{connection.instanceName}</code> : null}
              </header>
              <footer>
                <span>{connection?.lastConnectedAt ? `Conectado em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(connection.lastConnectedAt)}` : "Configure pelo painel da arena"}</span>
                {connection?.lastError ? <span className={viewStyles.form_error}>{connection.lastError}</span> : null}
              </footer>
            </article>
          );
        })}
      </section>
    </div>
  );
}
