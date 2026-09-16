import { createHmac, timingSafeEqual } from "node:crypto";

function readSignature(value: string | null) {
  const parts = new Map((value ?? "").split(",").map((part) => {
    const [key, ...rest] = part.trim().split("=");
    return [key, rest.join("=")];
  }));
  return { timestamp: parts.get("ts") ?? "", signature: parts.get("v1") ?? "" };
}

export function verifyMercadoPagoWebhookSignature({ secret, signatureHeader, requestId, dataId }: { secret: string; signatureHeader: string | null; requestId: string | null; dataId: string }) {
  const { timestamp, signature } = readSignature(signatureHeader);
  if (!secret || !timestamp || !signature || !requestId || !dataId) return false;
  const normalizedDataId = /[a-z]/i.test(dataId) ? dataId.toLowerCase() : dataId;
  const manifest = `id:${normalizedDataId};request-id:${requestId};ts:${timestamp};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  if (!/^[a-f0-9]{64}$/i.test(signature) || signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
}
