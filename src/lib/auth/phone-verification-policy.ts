/** Public production registration must prove control of the phone number. */
export function requiresPhoneVerification({ configured, production, appUrl }: {
  configured: boolean;
  production: boolean;
  appUrl?: string;
}): boolean {
  if (configured) return true;
  if (!production) return false;
  try {
    const url = new URL(appUrl ?? "");
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    return !loopback || !["http:", "https:"].includes(url.protocol);
  } catch {
    return true;
  }
}
