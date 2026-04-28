"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLinksProps = {
  canManageUsers: boolean;
};

export function NavLinks({ canManageUsers }: NavLinksProps) {
  const pathname = usePathname();
  const navigation = [
    { href: "/painel", label: "Painel" },
    { href: "/torneios", label: "Torneios" },
    { href: "/jogadores", label: "Jogadores" },
    { href: "/duplas", label: "Duplas" },
    { href: "/grupos", label: "Grupos" },
    { href: "/jogos", label: "Jogos" },
    { href: "/proximos-jogos", label: "Próximos Jogos" },
    ...(canManageUsers ? [{ href: "/usuarios", label: "Usuários" }] : []),
    { href: "/minha-conta", label: "Minha conta" }
  ];

  return (
    <nav className="top-nav" aria-label="Principal">
      {navigation.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link${isActive ? " nav-link-active" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
