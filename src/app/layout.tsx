import { headers } from "next/headers";
import { PortalPwaProvider } from "@/components/portal/portal-pwa-provider";
import { isPortalPwaPath, portalPwaEnabled } from "@/lib/portal/pwa-policy";
import { SystemTooltips } from "@/components/ui/system-tooltips";
import { Suspense } from "react";
import { NotificationTarget } from "@/components/notifications/notification-target";
import { documentUtilities } from "./document.utilities";
import type { Metadata, Viewport } from "next";
import "@/app/globals.css";
import { env } from "@/lib/env";
import { SystemUpdateNotice } from "@/components/system-update-notice";
import { releaseRevision } from "@/lib/release-version";

// A fresh request nonce is required for the framework bootstrap and hydration scripts.
export const dynamic = "force-dynamic";

const baseMetadata: Metadata = {
  metadataBase: env.appUrl ? new URL(env.appUrl) : undefined,
  title: "VX4",
  applicationName: "VX4",
  description: "VX4 — gestão de arenas, reservas, eventos e acesso do atleta.",
  icons: {
    icon: [{ url: "/favicon.ico?v=vx4-1", type: "image/x-icon", sizes: "16x16 32x32 48x48 64x64" }, { url: "/brand/vx4-app-512.png?v=vx4-1", type: "image/png", sizes: "512x512" }],
    apple: "/apple-touch-icon.png?v=vx4-1"
  }
};

export async function generateMetadata(): Promise<Metadata> {
  const pathname = (await headers()).get("x-portal-pathname") ?? "";
  if (!portalPwaEnabled() || !isPortalPwaPath(pathname)) return baseMetadata;
  return { ...baseMetadata, title: "VX4", manifest: "/portal/manifest.webmanifest", appleWebApp: { capable: true, title: "VX4", statusBarStyle: "default" }, applicationName: "VX4" };
}

export async function generateViewport(): Promise<Viewport> {
  const pathname = (await headers()).get("x-portal-pathname") ?? "";
  return portalPwaEnabled() && isPortalPwaPath(pathname)
    ? { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#174983" }
    : { width: "device-width", initialScale: 1 };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={documentUtilities}>
      <body className="tw:[&_input]:caret-current! tw:[&_textarea]:caret-current! tw:[&_[contenteditable=true]]:caret-current!"><SystemTooltips /><PortalPwaProvider enabled={portalPwaEnabled()}>{children}</PortalPwaProvider><Suspense fallback={null}><NotificationTarget /></Suspense><SystemUpdateNotice initialRevision={releaseRevision(process.env.RAILWAY_GIT_COMMIT_SHA)} /></body>
    </html>
  );
}
