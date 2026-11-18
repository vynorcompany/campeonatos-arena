/** Disabled by default. Enable only in an approved laboratory or after release approval. */
export function portalPwaEnabled(environment: Record<string, string | undefined> = process.env) {
  return environment.PORTAL_PWA_ENABLED === "true";
}

/** Keep the management application and its APIs outside the worker's fetch behavior. */
export function isPortalPwaPath(pathname: string) {
  return pathname === "/portal" || pathname.startsWith("/portal/")
    || pathname === "/home"
    || /^\/classificacao\/[^/]+(?:\/.*)?$/.test(pathname)
    || /^\/[^/]+\/portaldoatleta\/agendamento\/?$/.test(pathname)
    || /^\/checkin\/[^/]+\/?$/.test(pathname);
}

export function athletePortalManifest() {
  return {
    id: "/portal",
    name: "Portal do Atleta",
    short_name: "Portal do Atleta",
    lang: "pt-BR",
    start_url: "/portal",
    scope: "/",
    display: "standalone",
    background_color: "#102d51",
    theme_color: "#174983",
    icons: [{ src: "/padel-volley-mark.png?v=padel-man-volley-5", sizes: "512x512", type: "image/png", purpose: "any" }],
    shortcuts: [{ name: "Minhas arenas", url: "/portal" }],
  };
}
