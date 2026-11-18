import { isPortalPwaPath } from "./pwa-policy";
import { PORTAL_PWA_OFFLINE_DOCUMENT } from "./pwa-offline-document";

/** Network-only: no account data, HTML, API responses or pending mutations are cached. */
export function portalPwaWorkerSource() {
  return `"use strict";
const isPortalPath = ${isPortalPwaPath.toString()};
const offlineDocument = ${JSON.stringify(PORTAL_PWA_OFFLINE_DOCUMENT)};
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || request.mode !== "navigate" || url.origin !== self.location.origin || !isPortalPath(url.pathname)) return;
  event.respondWith(fetch(request, { cache: "no-store" }).catch(() => new Response(offlineDocument, {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
      "X-Content-Type-Options": "nosniff"
    }
  })));
});`;
}

/** An approved release can be disabled without leaving an old worker permanently active. */
export function disabledPortalPwaWorkerSource() {
  return `"use strict";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.registration.unregister()));`;
}
