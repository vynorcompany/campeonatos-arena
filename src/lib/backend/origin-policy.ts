/** Browser origin is checked independently of forwarded Host/X-Forwarded-Host. */
export function allowedFrontendOrigin(origin: string | null, configuration: string | undefined): boolean {
  if (!origin || !configuration) return false;
  try {
    const candidate = new URL(origin);
    if (!['https:', 'http:'].includes(candidate.protocol) || candidate.origin !== origin || candidate.username || candidate.password) return false;
    const entries: unknown = JSON.parse(configuration);
    return Array.isArray(entries) && entries.length <= 50 && entries.some(entry => typeof entry === 'string' && entry === origin);
  } catch { return false; }
}
