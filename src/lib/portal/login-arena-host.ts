/** Public branding only. This mapping never establishes an authenticated arena context. */
export function portalArenaSlugForHost(host: string | null | undefined, configuredHosts: string | undefined): string | null {
  if (!host || !configuredHosts || configuredHosts.length > 32768) return null;
  const normalize = (value: string) => {
    if (value.length > 260 || /[\s/@?#,\\]/.test(value)) return null;
    const hostname = value.toLowerCase().replace(/:\d{1,5}$/, "").replace(/\.$/, "");
    return hostname.split(".").every(label => /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)) ? hostname : null;
  };
  const hostname = normalize(host);
  if (!hostname) return null;
  try {
    const mapping: unknown = JSON.parse(configuredHosts);
    if (!mapping || typeof mapping !== "object" || Array.isArray(mapping)) return null;
    for (const [domain, slug] of Object.entries(mapping)) {
      if (normalize(domain) === hostname && typeof slug === "string" && slug.length <= 120 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return slug;
    }
  } catch { /* An invalid optional mapping leaves the shared Portal unbranded. */ }
  return null;
}
