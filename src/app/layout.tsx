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
    icon: [{ url: "/favicon.ico?v=padel-man-volley-5", type: "image/x-icon", sizes: "16x16 32x32 48x48 64x64" }, { url: "/padel-volley-mark.png?v=padel-man-volley-5", type: "image/png", sizes: "512x512" }],
    apple: "/apple-touch-icon.png?v=padel-man-volley-5"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={documentUtilities}>
      <body>{children}<Suspense fallback={null}><NotificationTarget /></Suspense><SystemUpdateNotice initialRevision={releaseRevision(process.env.RAILWAY_GIT_COMMIT_SHA)} /></body>
    </html>
  );
}
