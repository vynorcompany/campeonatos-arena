import "server-only";

export type FocusEnvironment = "SANDBOX" | "PRODUCTION";
export const focusBaseUrl = (environment: FocusEnvironment) => environment === "PRODUCTION" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";
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
export function focusDocumentUrl(environment: FocusEnvironment, path: unknown) {
  if (typeof path !== "string" || !path) return "";
  try {
    const url = new URL(path, focusBaseUrl(environment));
    return url.origin === focusBaseUrl(environment) && !url.username && !url.password ? url.toString() : "";
  } catch { return ""; }
}
