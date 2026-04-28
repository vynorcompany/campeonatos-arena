import type { Metadata } from "next";
import "@/app/globals.css";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: env.appUrl ? new URL(env.appUrl) : undefined,
  title: "Arena Padel Manager",
  description: "Sistema online para gestão de campeonatos, duplas, grupos e jogos da arena."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
