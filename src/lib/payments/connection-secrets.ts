import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

function encryptionKey() {
  const source = process.env.PAYMENT_CONNECTIONS_ENCRYPTION_KEY?.trim();
  if (!source) throw new Error("Conectores de pagamento indisponíveis: chave de criptografia não configurada.");
  return createHash("sha256").update(source).digest();
}

export function encryptConnectionSecrets(value: Record<string, string>) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function decryptConnectionSecrets(value: string): Record<string, string> {
  const payload = Buffer.from(value, "base64url");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")) as Record<string, string>;
}

export function hashWebhookSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
