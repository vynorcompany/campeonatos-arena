import { documentUtilities } from "./document.utilities";
import type { Metadata } from "next";
import "@/app/globals.css";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: env.appUrl ? new URL(env.appUrl) : undefined,
  title: "Arena Padel Manager",
  description: "Sistema online para gestão de campeonatos, duplas, grupos e jogos da arena.",
  icons: {
    icon: [{ url: "/favicon.ico?v=padel-2", type: "image/x-icon" }, { url: "/icon.svg?v=padel-2", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.png?v=padel-2"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={documentUtilities}>
      <body>{children}</body>
    </html>
  );
}
