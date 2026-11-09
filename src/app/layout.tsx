import { Suspense } from "react";
import { NotificationTarget } from "@/components/notifications/notification-target";
import { documentUtilities } from "./document.utilities";
import type { Metadata } from "next";
import "@/app/globals.css";
import { env } from "@/lib/env";
import { SystemUpdateNotice } from "@/components/system-update-notice";
import { releaseRevision } from "@/lib/release-version";

export const metadata: Metadata = {
  metadataBase: env.appUrl ? new URL(env.appUrl) : undefined,
  title: "Arena Padel Manager",
  description: "Sistema online para gestão de campeonatos, duplas, grupos e jogos da arena.",
  icons: {
    icon: [{ url: "/favicon.ico?v=padel-volley-4", type: "image/x-icon" }, { url: "/icon.svg?v=padel-volley-4", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.png?v=padel-volley-4"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={documentUtilities}>
      <body>{children}<Suspense fallback={null}><NotificationTarget /></Suspense><SystemUpdateNotice initialRevision={releaseRevision(process.env.RAILWAY_GIT_COMMIT_SHA)} /></body>
    </html>
  );
}
