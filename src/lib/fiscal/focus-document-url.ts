export type FocusEnvironment = "SANDBOX" | "PRODUCTION";
export const focusBaseUrl = (environment: FocusEnvironment) => environment === "PRODUCTION" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";
export function focusDocumentUrl(environment: FocusEnvironment, path: unknown) {
  if (typeof path !== "string" || !path) return "";
  try {
    const url = new URL(path, focusBaseUrl(environment));
    return url.origin === focusBaseUrl(environment) && !url.username && !url.password ? url.toString() : "";
  } catch { return ""; }
}
