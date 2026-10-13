import { createHash } from "node:crypto";

export function mercadoPagoIdempotencyKey(method: "pix" | "card" | "boleto", arenaId: string, externalReference: string) {
  // Mercado Pago rejects keys shaped as "prefix_...". Hashing also keeps
  // references with ':' or '_' within the provider's accepted key format.
  const digest = createHash("sha256")
    .update(JSON.stringify([method, arenaId, externalReference]))
    .digest("hex");
  return `${method}${digest}`;
}
