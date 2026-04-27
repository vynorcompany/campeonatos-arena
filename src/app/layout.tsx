import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Arena Padel Manager",
  description: "Sistema para ranking, duplas balanceadas, grupos e jogos automatizados."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
