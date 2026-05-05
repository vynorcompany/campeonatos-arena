"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type AgencyNavItem = {
  href: string;
  label: string;
  children?: AgencyNavItem[];
};

const groups: Array<{ title: string; links: AgencyNavItem[] }> = [
  {
    title: "Visão geral",
    links: [{ href: "/agencia", label: "Dashboard" }]
  },
  {
    title: "Operação",
    links: [
      {
        href: "/agencia/arenas",
        label: "Arenas",
        children: [
          { href: "/agencia/arenas", label: "Todas as arenas" },
          { href: "/agencia/arenas/usuarios", label: "Usuários das arenas" }
        ]
      }
    ]
  },
  {
    title: "Financeiro",
    links: [
      {
        href: "/agencia/financeiro",
        label: "Financeiro da agência",
        children: [
          { href: "/agencia/financeiro", label: "Dashboard financeiro" },
          { href: "/agencia/financeiro/mrr", label: "MRR" },
          { href: "/agencia/financeiro/previsoes", label: "Previsões" }
        ]
      }
    ]
  },
  {
    title: "Atendimento",
    links: [
      {
        href: "/agencia/suporte",
        label: "Área de suporte",
        children: [
          { href: "/agencia/suporte", label: "Tickets" },
          { href: "/agencia/suporte/historico", label: "Histórico" }
        ]
      }
    ]
  }
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AgencyNavLinks() {
  const pathname = usePathname();
  const [openItems, setOpenItems] = useState<Set<string>>(
    () => new Set(groups.flatMap((group) => group.links.filter((item) => isActivePath(pathname, item.href)).map((item) => item.href)))
  );

  return (
    <nav className="agency-nav" aria-label="Agência">
      {groups.map((group) => (
        <div className="nav-group" key={group.title}>
          <p className="nav-group-label">{group.title}</p>
          <div className="nav-group-links">
            {group.links.map((item) => {
              const isOpen = openItems.has(item.href) || isActivePath(pathname, item.href);
              const isActive = pathname === item.href;

              return (
                <div className="nav-link-block" key={item.href}>
                  <div className="nav-parent-row">
                    <Link href={item.href} className={`nav-link${isActive ? " nav-link-active" : ""}`}>
                      <span>{item.label}</span>
                    </Link>
                    {item.children?.length ? (
                      <button
                        className="nav-toggle"
                        type="button"
                        aria-label={isOpen ? `Fechar ${item.label}` : `Abrir ${item.label}`}
                        aria-expanded={isOpen}
                        onClick={() => {
                          setOpenItems((current) => {
                            const next = new Set(current);
                            if (next.has(item.href)) {
                              next.delete(item.href);
                            } else {
                              next.add(item.href);
                            }
                            return next;
                          });
                        }}
                      >
                        <span aria-hidden="true">{isOpen ? "-" : "+"}</span>
                      </button>
                    ) : null}
                  </div>
                  {item.children?.length ? (
                    <div className={`nav-submenu${isOpen ? " nav-submenu-open" : ""}`}>
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`nav-sub-link${isActivePath(pathname, child.href) ? " nav-sub-link-active" : ""}`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
