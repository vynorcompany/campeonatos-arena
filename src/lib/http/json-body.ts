/** Bound decoded request bytes as well as Content-Length (which may be absent). */
export class RequestBodyTooLargeError extends Error {
  constructor() { super("O corpo da solicitação excede o limite permitido."); }
}

export async function readBoundedJson(request: Request, maxBytes: number): Promise<any> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new RangeError("Invalid body limit");
  const declared = request.headers.get("content-length");
  if (declared && Number(declared) > maxBytes) throw new RequestBodyTooLargeError();
  if (!request.body) return JSON.parse("");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        // Do not wait for a potentially unending upstream stream to acknowledge cancellation.
        void reader.cancel().catch(() => {});
        throw new RequestBodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}
