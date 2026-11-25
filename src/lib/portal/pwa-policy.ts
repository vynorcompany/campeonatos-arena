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
    name: "VX4",
    short_name: "VX4",
    lang: "pt-BR",
    start_url: "/portal",
    scope: "/",
    display: "standalone",
    background_color: "#102d51",
    theme_color: "#174983",
    icons: [
      { src: "/brand/vx4-app-192.png?v=vx4-1", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/vx4-app-512.png?v=vx4-1", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/vx4-app-512.png?v=vx4-1", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [{ name: "Minhas arenas", url: "/portal" }],
  };
}
