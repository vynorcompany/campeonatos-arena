"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type IconName =
  | "dashboard"
  | "trophy"
  | "tv"
  | "lesson"
  | "cart"
  | "finance"
  | "building"
  | "users"
  | "account"
  | "calendar"
  | "support";

type NavItem = {
  href: string;
  label: string;
  icon?: IconName;
  children?: NavItem[];
};

type NavGroup = {
  title: string;
  links: NavItem[];
};

type NavLinksProps = {
  canManageUsers: boolean;
  visibleModules: string[];
};

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavIcon({ name }: { name: IconName }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true
  };

  const paths: Record<IconName, React.ReactNode> = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="8" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="15" width="7" height="6" rx="1.5" />
      </>
    ),
    trophy: (
      <>
        <path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" />
        <path d="M6 5H4v2a3 3 0 0 0 3 3" />
        <path d="M18 5h2v2a3 3 0 0 1-3 3" />
        <path d="M12 12v5" />
        <path d="M9 21h6" />
        <path d="M10 17h4" />
      </>
    ),
    tv: (
      <>
        <rect x="3" y="5" width="18" height="12" rx="2" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
      </>
    ),
    lesson: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" />
        <path d="M8 7h8" />
        <path d="M8 11h6" />
      </>
    ),
    cart: (
      <>
        <path d="M4 5h2l2.2 10.4A2 2 0 0 0 10.1 17H18" />
        <path d="M8 7h12l-1.6 6H9.3" />
        <circle cx="10" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
      </>
    ),
    finance: (
      <>
        <path d="M12 2v20" />
        <path d="M17 6.5c-.8-1-2.4-1.5-4.2-1.5-2.4 0-4.3 1-4.3 2.8 0 4.2 8.5 1.8 8.5 6.4 0 1.9-1.9 3.1-4.5 3.1-2 0-3.7-.6-4.7-1.8" />
      </>
    ),
    building: (
      <>
        <path d="M4 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16" />
        <path d="M17 9h2a1 1 0 0 1 1 1v11" />
        <path d="M8 7h1" />
        <path d="M12 7h1" />
        <path d="M8 11h1" />
        <path d="M12 11h1" />
        <path d="M8 15h1" />
        <path d="M12 15h1" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 21a6 6 0 0 1 12 0" />
        <circle cx="17" cy="9" r="2.5" />
        <path d="M16 15.2a5 5 0 0 1 5 4.8" />
      </>
    ),
    account: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    calendar: (
      <>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4" />
        <path d="M16 3v4" />
        <path d="M4 10h16" />
        <path d="M8 14h3" />
        <path d="M13 14h3" />
        <path d="M8 17h3" />
      </>
    ),
    support: (
      <>
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
        <path d="M9 8h6" />
        <path d="M9 12h4" />
      </>
    )
  };

  return <svg {...common}>{paths[name]}</svg>;
}

export function NavLinks({ canManageUsers, visibleModules }: NavLinksProps) {
  const pathname = usePathname() ?? "";
  const openItemsStorageKey = "arena:sidebar-open-items";
  const canSee = (module: string) => visibleModules.includes(module);
  const navigationGroups: NavGroup[] = [
    {
      title: "Início",
      links: [{ href: "/painel", label: "Dashboard", icon: "dashboard" }]
    },
    {
      title: "Campeonatos",
      links: [
        {
          href: "/torneios",
          label: "Torneios",
          icon: "trophy",
          children: [
            { href: "/jogos", label: "Jogos" },
            { href: "/torneios/rankings", label: "Rankings" }
          ]
        },
        {
          href: "/calendario",
          label: "Calendário",
          icon: "calendar"
        },
        {
          href: "/proximos-jogos",
          label: "Tela da TV",
          icon: "tv",
          children: [
            { href: "/proximos-jogos/apresentacao", label: "Configurar slides" },
            { href: "/proximos-jogos/tv", label: "Abrir TV" }
          ]
        }
      ]
    },
    {
      title: "Gestão",
      links: [
        {
          href: "/players",
          label: "Atletas",
          icon: "users"
        },
        {
          href: "/aulas",
          label: "Aulas",
          icon: "lesson",
          children: [
            { href: "/aulas/alunos", label: "Alunos" },
            { href: "/aulas/registrar", label: "Registrar aula" },
            { href: "/professores", label: "Professores" }
          ]
        },
        {
          href: "/pdv",
          label: "PDV e estoque",
          icon: "cart",
          children: [
            { href: "/pdv/caixa", label: "Caixa" },
            { href: "/pdv/estoque", label: "Estoque" },
            { href: "/pdv/vendas", label: "Vendas" }
          ]
        }
      ]
    },
    {
      title: "Financeiro",
      links: [
        {
          href: "/financeiro",
          label: "Dashboard",
          icon: "finance",
          children: [
            { href: "/financeiro/planos", label: "Planos" },
            { href: "/financeiro/mensalidades", label: "Mensalidades" },
            { href: "/financeiro/folha", label: "Folha" },
            { href: "/financeiro/lancamentos", label: "Lançamentos" },
            { href: "/financeiro/pdv-estoque", label: "PDV/estoque" }
          ]
        }
      ]
    },
    {
      title: "Administração",
      links: [
        { href: "/suporte", label: "Suporte/Ajuda", icon: "support" },
        {
          href: "/arena",
          label: "Configurações",
          icon: "building",
          children: [
            { href: "/arena", label: "Arena" },
            { href: "/arena/regulamento", label: "Regulamento" },
            ...(canManageUsers ? [{ href: "/usuarios", label: "Usuários" }] : []),
            { href: "/minha-conta", label: "Minha conta" }
          ]
        }
      ]
    }
  ];
  const moduleByHref: Record<string, string> = {
    "/painel": "dashboard",
    "/torneios": "tournaments",
    "/jogadores": "players",
    "/players": "players",
    "/duplas": "pairs",
    "/grupos": "groups",
    "/jogos": "matches",
    "/torneios/rankings": "tournaments",
    "/proximos-jogos": "tv",
    "/proximos-jogos/apresentacao": "tv",
    "/proximos-jogos/tv": "tv",
    "/calendario": "calendar",
    "/aulas": "lessons",
    "/aulas/alunos": "students",
    "/aulas/registrar": "lessons",
    "/professores": "teachers",
    "/pdv": "pos",
    "/pdv/caixa": "pos",
    "/pdv/estoque": "stock",
    "/pdv/vendas": "pos",
    "/financeiro": "finance",
    "/financeiro/planos": "finance",
    "/financeiro/mensalidades": "finance",
    "/financeiro/folha": "finance",
    "/financeiro/lancamentos": "finance",
    "/financeiro/pdv-estoque": "finance",
    "/arena": "arena",
    "/arena/regulamento": "arena",
    "/suporte": "support",
    "/usuarios": "users",
    "/minha-conta": "dashboard"
  };
  const filteredGroups = navigationGroups
    .map((group) => ({
      ...group,
      links: group.links
        .map((item) => ({
          ...item,
          children: item.children?.filter((child) => canSee(moduleByHref[child.href] ?? "dashboard"))
        }))
        .filter((item) => canSee(moduleByHref[item.href] ?? "dashboard") || (item.children?.length ?? 0) > 0)
    }))
    .filter((group) => group.links.length);
  const initialOpenItems = filteredGroups.flatMap((group) =>
    group.links.filter((item) => item.children?.length && isActivePath(pathname, item.href)).map((item) => item.href)
  );
  const [openItems, setOpenItems] = useState<Set<string>>(() => {
    if (typeof window === "undefined") {
      return new Set(initialOpenItems);
    }

    const stored = window.localStorage.getItem(openItemsStorageKey);
    if (!stored) {
      return new Set(initialOpenItems);
    }

    try {
      const parsed = JSON.parse(stored) as string[];
      return new Set(parsed);
    } catch {
      return new Set(initialOpenItems);
    }
  });

  useEffect(() => {
    const activeParent = filteredGroups
      .flatMap((group) => group.links)
      .find((item) => item.children?.length && isActivePath(pathname, item.href));

    if (!activeParent) {
      return;
    }

    setOpenItems((current) => {
      if (current.has(activeParent.href)) {
        return current;
      }

      const next = new Set(current);
      next.add(activeParent.href);
      return next;
    });
  }, [filteredGroups, pathname]);

  useEffect(() => {
    window.localStorage.setItem(openItemsStorageKey, JSON.stringify([...openItems]));
  }, [openItems]);

  function toggleItem(href: string) {
    setOpenItems((current) => {
      const next = new Set(current);
      if (next.has(href)) {
        next.delete(href);
      } else {
        next.add(href);
      }
      return next;
    });
  }

  return (
    <nav className="side-nav" aria-label="Principal">
      {filteredGroups.map((group) => (
        <div className="nav-group" key={group.title}>
          <p className="nav-group-label">{group.title}</p>
          <div className="nav-group-links">
            {group.links.map((item) => {
              const isActive = isActivePath(pathname, item.href);
              const isOpen = openItems.has(item.href) || isActive;

              return (
                <div className="nav-link-block" key={item.href}>
                  <div className="nav-parent-row">
                    <Link href={item.href} className={`nav-link${isActive ? " nav-link-active" : ""}`}>
                      <span className="nav-icon" aria-hidden="true">{item.icon ? <NavIcon name={item.icon} /> : null}</span>
                      <span>{item.label}</span>
                    </Link>
                    {item.children?.length ? (
                      <button
                        className="nav-toggle"
                        type="button"
                        aria-label={isOpen ? `Fechar ${item.label}` : `Abrir ${item.label}`}
                        aria-expanded={isOpen}
                        onClick={() => toggleItem(item.href)}
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
