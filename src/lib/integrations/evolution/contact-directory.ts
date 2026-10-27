import "server-only";
import { env } from "@/lib/env";
import { arenaDatabase } from "@/lib/arena-database";
import { normalizeWhatsAppAccountJid } from "@/lib/whatsapp-account";
import { readEvolutionContacts } from "./contacts";

const subscriptions = new Map<string, number>();

export async function getEvolutionContacts(arenaId: string, expectedAccountJid: string) {
  const connection = await arenaDatabase(arenaId).whatsAppConnection.findUnique({ where: { arenaId } });
  if (!expectedAccountJid || connection?.status !== "CONNECTED" || normalizeWhatsAppAccountJid(connection.connectedPhone) !== expectedAccountJid) throw new Error("A conta do WhatsApp mudou. Atualize a página.");
  if (!env.evolutionApiUrl || !env.evolutionApiKey) throw new Error("A integração Evolution ainda não está configurada.");
  // Upgrade an already connected instance without logging it out or rotating its secret.
  const subscriptionKey = `${arenaId}:${connection.instanceName}:${connection.webhookSecretHash}`;
  let eventsEnabled = (subscriptions.get(subscriptionKey) ?? 0) >= Date.now();
  if (connection.encryptedToken && (subscriptions.get(subscriptionKey) ?? 0) < Date.now()) {
    const { decryptConnectionSecrets, hashWebhookSecret } = await import("@/lib/payments/connection-secrets");
    const { configureEvolutionWebhook } = await import("./agency");
    const secret = decryptConnectionSecrets(connection.encryptedToken).webhookSecret;
    if (secret && hashWebhookSecret(secret) === connection.webhookSecretHash) {
      try {
        await configureEvolutionWebhook({ instanceName: connection.instanceName, webhookSecret: secret });
        if (subscriptions.size > 2048) subscriptions.clear();
        subscriptions.set(subscriptionKey, Date.now() + 60 * 60_000);
        eventsEnabled = true;
      } catch { /* Contact lookup remains available when webhook configuration is unavailable. */ }
    }
  }
  const directory = new Map<string, ReturnType<typeof readEvolutionContacts>[number]>();
  let truncated = false;
  const deadline = AbortSignal.timeout(25_000);
  // Evolution's `offset` is the page size. Bound work even on versions ignoring pagination.
  for (let page = 1; page <= 20; page++) {
    const response = await fetch(`${env.evolutionApiUrl.replace(/\/$/, "")}/chat/findContacts/${encodeURIComponent(connection.instanceName)}`, {
      method: "POST", headers: { apikey: env.evolutionApiKey, "content-type": "application/json" },
      body: JSON.stringify({ where: {}, offset: 500, page }), cache: "no-store", signal: AbortSignal.any([deadline, AbortSignal.timeout(8_000)]),
    });
    if (!response.ok) throw new Error(`Não foi possível buscar os contatos do WhatsApp (${response.status}).`);
    const payload: unknown = await response.json();
    const batch = readEvolutionContacts(payload);
    let added = 0;
    for (const contact of batch) if (contact.remoteJid !== expectedAccountJid) {
      if (!directory.has(contact.remoteJid)) added++;
      directory.set(contact.remoteJid, contact);
    }
    const raw = Array.isArray(payload) ? payload : null;
    if (raw && raw.length < 500) break;
    if (!added) { truncated = !!raw?.length; break; }
    if (page === 20) truncated = true;
  }
  return { contacts: [...directory.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")), truncated, eventsEnabled, instanceName: connection.instanceName };
}
