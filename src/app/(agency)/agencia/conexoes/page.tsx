import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { connectAgencyArenaWhatsAppAction, refreshAgencyArenaWhatsAppQrAction } from "@/lib/actions/agency";
import { requireAgencyAccess } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function AgencyConnectionsPage() {
  await requireAgencyAccess();
  const arenas = await prisma.arena.findMany({
    orderBy: { name: "asc" },
    include: { whatsappConnection: true }
  });

  return (
    <div className="stack-md agency-connections-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">INTEGRAÇÕES</p>
          <h1>Conexões das arenas</h1>
          <p className="muted">Cada arena conecta seu próprio WhatsApp Business em uma instância Evolution isolada.</p>
        </div>
      </header>
      <section className="agency-connection-list">
        {arenas.map((arena) => {
          const connection = arena.whatsappConnection;
          const connected = connection?.status === "CONNECTED";
          return (
            <article key={arena.id} className="agency-connection-card">
              <header>
                <div>
                  <span className={`agency-connection-status ${connected ? "is-connected" : ""}`}><i />{connected ? "Conectado" : connection ? "Aguardando conexão" : "Não configurado"}</span>
                  <h2>{arena.name}</h2>
                  <p>{connected ? `WhatsApp ${connection?.connectedPhone || "conectado"}` : "Conecte o número de WhatsApp Business desta arena."}</p>
                </div>
                {connection ? <code>{connection.instanceName}</code> : null}
              </header>
              {connection?.qrCodeDataUrl && !connected ? (
                <div className="agency-whatsapp-qr">
                  <img src={connection.qrCodeDataUrl} alt={`QR Code para conectar o WhatsApp da ${arena.name}`} />
                  <div>
                    <strong>Escaneie o QR Code</strong>
                    <p>No WhatsApp Business, abra Dispositivos conectados e toque em Conectar dispositivo.</p>
                    <SafeActionForm action={refreshAgencyArenaWhatsAppQrAction} successMessage="QR Code atualizado.">
                      <input type="hidden" name="arenaId" value={arena.id} />
                      <SubmitButton label="Gerar novo QR Code" pendingLabel="Gerando..." className="button button-small" />
                    </SafeActionForm>
                  </div>
                </div>
              ) : (
                <div className="agency-connection-actions">
                  <SafeActionForm action={connectAgencyArenaWhatsAppAction} successMessage="Instância criada. Escaneie o QR Code para concluir.">
                    <input type="hidden" name="arenaId" value={arena.id} />
                    <SubmitButton label={connected ? "Reconectar WhatsApp" : "Conectar WhatsApp"} pendingLabel="Preparando conexão..." className="button button-primary button-small" />
                  </SafeActionForm>
                  {connection?.lastError ? <p className="form-error">{connection.lastError}</p> : null}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );
}
