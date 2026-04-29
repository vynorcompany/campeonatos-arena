"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLinksProps = {
  canManageUsers: boolean;
};

export function NavLinks({ canManageUsers }: NavLinksProps) {
  const pathname = usePathname();
  const navigationGroups = [
    {
      title: "Visão geral",
      links: [{ href: "/painel", label: "Painel" }]
    },
    {
      title: "Campeonatos",
      links: [
        { href: "/torneios", label: "Torneios" },
        { href: "/jogadores", label: "Jogadores" },
        { href: "/duplas", label: "Duplas" },
        { href: "/grupos", label: "Grupos" },
        { href: "/jogos", label: "Jogos" },
        { href: "/proximos-jogos", label: "Próximos Jogos" }
      ]
    },
    {
      title: "Administração",
      links: [
        ...(canManageUsers ? [{ href: "/usuarios", label: "Usuários" }] : []),
        { href: "/minha-conta", label: "Minha conta" }
      ]
    }
  ];

  return (
    <nav className="side-nav" aria-label="Principal">
      {navigationGroups.map((group) => (
        <div className="nav-group" key={group.title}>
          <p className="nav-group-label">{group.title}</p>
          <div className="nav-group-links">
            {group.links.map((item) => {
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
          </div>
        </div>
      ))}
    </nav>
  );
}
