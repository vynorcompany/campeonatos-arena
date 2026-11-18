/** Shared by the baseline headers and the per-request Next middleware. */
export function contentSecurityPolicy({ nonce, development = false } = {}) {
  if (nonce !== undefined && !/^[A-Za-z0-9+/]{22,}={0,2}$/.test(nonce)) throw new Error('Invalid CSP nonce.');
  return [
    "worker-src 'self'", "manifest-src 'self'",
    "default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'", "form-action 'self'",
    "img-src 'self' data: blob: https:", "media-src 'self' blob: https:", "font-src 'self' data: https:",
    // Calculated layout styles remain supported; script execution is independently restricted.
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self'${nonce ? ` 'nonce-${nonce}' 'strict-dynamic'` : ''}${development ? " 'unsafe-eval'" : ''} https://*.mercadopago.com`,
    "script-src-attr 'none'",
    "connect-src 'self' https://api.mercadopago.com https://*.mercadopago.com",
    "frame-src https://*.mercadopago.com", "upgrade-insecure-requests",
  ].join('; ');
}
