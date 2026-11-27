import "server-only";

import { focusBaseUrl, type FocusEnvironment } from './focus-document-url';
export { focusBaseUrl, focusDocumentUrl, type FocusEnvironment } from './focus-document-url';
export class FocusHttpError extends Error {
  constructor(public status: number, public providerCode: string) { super(`Focus: requisição não concluída (HTTP ${status}).`); }
}
export async function focusRequest(environment: FocusEnvironment, token: string, path: string, method = "GET", body?: unknown) {
  if (!token || !/^\/v2\/nfce(?:[/?]|$)/.test(path)) throw new Error("Configuração da Focus inválida.");
  const response = await fetch(`${focusBaseUrl(environment)}${path}`, {
    method, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(25000),
    headers: { authorization: `Basic ${Buffer.from(`${token}:`).toString("base64")}`, "content-type": "application/json", accept: "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new FocusHttpError(response.status, String(data.codigo ?? ""));
  return data;
}
