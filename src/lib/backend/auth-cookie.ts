/** Only the athlete session may be relayed by the Portal authentication contract. */
export function athleteSessionCookie(header: string) {
  const [pair, ...attributes] = header.split(';');
  const separator = pair.indexOf('=');
  if (separator < 0 || pair.slice(0, separator).trim() !== 'arena_player_session') throw new Error('Unexpected authentication cookie');
  const value = decodeURIComponent(pair.slice(separator + 1).trim());
  if (value && !/^[a-f0-9]{64}$/.test(value)) throw new Error('Invalid authentication cookie');
  let expires: Date | undefined;
  let maxAge: number | undefined;
  for (const entry of attributes) {
    const [name, ...parts] = entry.trim().split('=');
    if (name.toLowerCase() === 'expires') {
      expires = new Date(parts.join('='));
      if (!Number.isFinite(expires.getTime())) throw new Error('Invalid cookie expiry');
    }
    if (name.toLowerCase() === 'max-age') {
      maxAge = Number(parts.join('='));
      if (!Number.isSafeInteger(maxAge) || maxAge < 0 || maxAge > 14 * 86400) throw new Error('Invalid cookie lifetime');
    }
  }
  return { name: 'arena_player_session', value, httpOnly: true as const, sameSite: 'lax' as const, path: '/', ...(expires ? { expires } : {}), ...(maxAge !== undefined ? { maxAge } : {}) };
}
