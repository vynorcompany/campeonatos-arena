export function managementAuthenticationCookie(header: string, sessionName: string, arenaName: string) {
  const [pair, ...attributes] = header.split(';');
  const separator = pair.indexOf('=');
  const name = pair.slice(0, separator).trim();
  if (separator < 0 || ![sessionName, arenaName].includes(name)) throw new Error('Unexpected management cookie');
  const value = decodeURIComponent(pair.slice(separator + 1).trim());
  if (name === sessionName && value && !/^[a-f0-9]{64}$/.test(value)) throw new Error('Invalid management session cookie');
  if (name === arenaName && (value.length > 256 || /[\x00-\x20;\x7f]/.test(value))) throw new Error('Invalid arena cookie');
  let expires: Date | undefined;
  let maxAge: number | undefined;
  for (const entry of attributes) {
    const [key, ...parts] = entry.trim().split('=');
    if (key.toLowerCase() === 'expires') {
      expires = new Date(parts.join('='));
      if (!Number.isFinite(expires.getTime())) throw new Error('Invalid cookie expiry');
    }
    if (key.toLowerCase() === 'max-age') {
      maxAge = Number(parts.join('='));
      if (!Number.isSafeInteger(maxAge) || maxAge < 0 || maxAge > 90 * 86400) throw new Error('Invalid cookie lifetime');
    }
  }
  return { name, value, path: '/', httpOnly: true as const, sameSite: 'lax' as const, ...(expires ? { expires } : {}), ...(maxAge !== undefined ? { maxAge } : {}) };
}
