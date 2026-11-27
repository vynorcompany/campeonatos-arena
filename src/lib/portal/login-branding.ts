import "server-only";
import { loginBrandingSchema, type LoginBranding } from "@/lib/backend/contracts/login-branding";
import { readBackendContract } from "@/lib/backend/http-client";

export async function getLoginBranding(host: string | null): Promise<LoginBranding> {
  if (process.env.VX4_BACKEND_ORIGIN) {
    return readBackendContract(process.env.VX4_BACKEND_ORIGIN,
      `/api/portal/login-branding?host=${encodeURIComponent(host ?? "")}`, loginBrandingSchema);
  }
  // Temporary compatibility while the other frontend domains are migrated.
  // A configured backend failure must never fall back to the database.
  const { resolveLoginBranding } = await import("@/lib/backend/services/login-branding");
  return resolveLoginBranding(host);
}
