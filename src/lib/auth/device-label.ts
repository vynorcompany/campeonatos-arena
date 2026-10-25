/** Store a coarse label, never the raw user-agent or an IP address. */
export function deviceLabel(userAgent: string) {
  const value = userAgent.slice(0, 1024);
  const browser = /Edg\//.test(value) ? "Edge" : /Firefox\//.test(value) ? "Firefox" : /Chrome\//.test(value) ? "Chrome" : /Safari\//.test(value) ? "Safari" : "Navegador";
  const system = /Android/.test(value) ? "Android" : /iPhone|iPad/.test(value) ? "iOS" : /Windows/.test(value) ? "Windows" : /Macintosh|Mac OS/.test(value) ? "macOS" : /Linux/.test(value) ? "Linux" : "Sistema não informado";
  return `${browser} · ${system}`;
}
