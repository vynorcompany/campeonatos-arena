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
  title: "Arena Padel Manager",
  description: "Sistema online para gestão de campeonatos, duplas, grupos e jogos da arena.",
  icons: {
    icon: [{ url: "/favicon.ico?v=padel-man-volley-5", type: "image/x-icon", sizes: "16x16 32x32 48x48 64x64" }, { url: "/padel-volley-mark.png?v=padel-man-volley-5", type: "image/png", sizes: "512x512" }],
    apple: "/apple-touch-icon.png?v=padel-man-volley-5"
  }
};

export async function generateMetadata(): Promise<Metadata> {
  const pathname = (await headers()).get("x-portal-pathname") ?? "";
  if (!portalPwaEnabled() || !isPortalPwaPath(pathname)) return baseMetadata;
  return { ...baseMetadata, title: "Portal do Atleta", manifest: "/portal/manifest.webmanifest", appleWebApp: { capable: true, title: "Portal do Atleta", statusBarStyle: "default" }, applicationName: "Portal do Atleta" };
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
