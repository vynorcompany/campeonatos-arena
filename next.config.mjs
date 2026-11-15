import { contentSecurityPolicy } from "./src/lib/security/content-security-policy.mjs";
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "Content-Security-Policy", value: contentSecurityPolicy() },
        { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        // O gravador do canal WhatsApp usa getUserMedia no próprio domínio.
        // Mantemos os demais recursos sensíveis bloqueados.
        { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(), payment=()" }
      ]
    }];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb"
    }
  },
  images: {
    unoptimized: true
  }
};

export default nextConfig;
