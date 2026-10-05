"use client";

import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./nav-links.utilities";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useWhatsAppUnreadCount } from "@/components/whatsapp/use-whatsapp-unread-count";

type IconName =
  | "dashboard"
  | "trophy"
  | "tv"
  | "lesson"
  | "cart"
  | "finance"
  | "cash"
  | "building"
  | "users"
  | "account"
  | "calendar"
  | "support"
  | "whatsapp"
  | "chevron";

type NavItem = {
  href: string;
  label: string;
  icon?: IconName;
  badge?: number;
  children?: NavItem[];
};

type NavGroup = {
  title: string;
  links: NavItem[];
};

type NavLinksProps = {
  canManageUsers: boolean;
  visibleModules: string[];
  whatsappUnreadCount: number;
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
    cash: (
      <>
        <rect x="3" y="6" width="18" height="14" rx="2" />
        <path d="M3 10h18M7 3h10" />
        <circle cx="12" cy="15" r="2" />
        <path d="M6 15h1m10 0h1" />
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
    ),
    whatsapp: (
      <>
        <path d="M20.5 11.5a8.5 8.5 0 0 1-12.57 7.5L3.5 20.5 5 16.16A8.5 8.5 0 1 1 20.5 11.5Z" />
        <path d="M8.48 7.9c.15-.36.3-.37.57-.37h.42c.14 0 .3.02.4.27l.63 1.5c.08.2.07.34-.04.49l-.38.48c-.12.14-.1.28 0 .42.38.67.98 1.28 1.66 1.66.14.08.28.1.42 0l.48-.38c.15-.12.3-.12.49-.04l1.5.63c.25.1.27.26.27.4v.42c0 .27-.01.42-.37.57-.36.15-1.15.19-2.25-.29-1.37-.6-2.91-2.14-3.5-3.5-.48-1.1-.44-1.89-.29-2.25Z" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />
  };

  return <svg {...common} className={cx(name === "whatsapp" ? "nav-svg-whatsapp" : undefined)}>{paths[name]}</svg>;
}

export function NavLinks({ canManageUsers, visibleModules, whatsappUnreadCount }: NavLinksProps) {
  const pathname = usePathname() ?? "";
  const openItemsStorageKey = "arena:sidebar-open-items";
  const canSee = (module: string) => visibleModules.includes(module);
  const liveWhatsAppUnreadCount = useWhatsAppUnreadCount(whatsappUnreadCount, canSee("support"));
  const navigationGroups: NavGroup[] = [
    {
      title: "Início",
      links: [
        { href: "/painel", label: "Dashboard", icon: "dashboard" },
        ...(canManageUsers ? [{ href: "/assistente", label: "Assistente", icon: "support" as IconName }] : []),
        ...(canSee("support") ? [{ href: "/whatsapp", label: "WhatsApp", icon: "whatsapp" as IconName, badge: liveWhatsAppUnreadCount }] : []),
        ...(canSee("pos") ? [{ href: "/pdv/caixa", label: "Gerenciar Caixa", icon: "cash" as IconName }] : [])
      ]
    },
    {
      title: "Painéis",
      links: [
        {
          href: "/torneios",
          label: "Torneios",
          icon: "trophy",
          children: [
            { href: "/jogos", label: "Eventos ativos" },
            { href: "/torneios/rankings", label: "Rankings" }
          ]
        },
        {
          href: "/agenda",
          label: "Grade de Horários",
          icon: "calendar"
        },
        {
          href: "/comandas",
          label: "Comandas",
          icon: "cart"
        },
        {
          href: "/proximos-jogos/apresentacao",
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
      title: "Arena",
      links: [
        {
          href: "/players",
          label: "Clientes",
          icon: "users"
        },
        {
          href: "/professores",
          label: "Professores",
          icon: "lesson"
        }
      ]
    },
    {
      title: "Gestão",
      links: [
        {
          href: "/proximos-jogos/patrocinios",
          label: "Gestão de patrocínios",
          icon: "building"
        },
        {
          href: "/financeiro",
          label: "Financeiro",
          icon: "finance",
          children: [
            { href: "/financeiro/planos", label: "Planos" },
            { href: "/financeiro/mensalidades", label: "Mensalidades" },
            { href: "/financeiro/folha", label: "Folha" },
            { href: "/financeiro/pdv-estoque", label: "PDV/estoque" },
            { href: "/financeiro/contas-a-receber", label: "Contas a Receber" },
            { href: "/financeiro/contas-a-pagar", label: "Contas a Pagar" },
            { href: "/pdv", label: "Produtos e Serviços", children: [
              { href: "/pdv/estoque", label: "Estoque" },
              { href: "/pdv/balanco", label: "Criar balanço" }
            ] },
            {
              href: "/financeiro/configuracoes",
              label: "Configurações Financeiras",
              children: [
                { href: "/financeiro/configuracoes/categorias-financeiras", label: "Categorias Financeiras" },
                { href: "/financeiro/configuracoes/categorias-produtos", label: "Categorias de Produtos" },
                { href: "/financeiro/configuracoes/pagamentos-online", label: "Pagamentos Online" },
                { href: "/financeiro/configuracoes/contas-bancarias", label: "Contas Bancárias" },
                { href: "/financeiro/configuracoes/cupons", label: "Cupons" },
                { href: "/financeiro/configuracoes/fornecedores", label: "Fornecedores" },
                { href: "/financeiro/configuracoes/formas-pagamento", label: "Formas de Pagamentos" },
                { href: "/financeiro/configuracoes/notas-fiscais", label: "Notas Fiscais", children: [
                  { href: "/financeiro/configuracoes/notas-fiscais?secao=emissao", label: "Configurações de Emissão" }
                ] }
              ]
            }
          ]
        },
        {
          href: "/relatorios",
          label: "Relatórios",
          icon: "building",
          children: [
            { href: "/relatorios/caixa", label: "Relatório de Caixa" },
            { href: "/relatorios/lancamentos", label: "Relatório de Lançamentos" },
            { href: "/relatorios/produtos", label: "Relatórios de Produtos" },
            { href: "/relatorios/estoque", label: "Movimentação de Estoque" },
            { href: "/relatorios/comandas", label: "Histórico de Comandas" },
            { href: "/relatorios/dre", label: "DRE Gerencial" },
            { href: "/relatorios/planos", label: "Relatório de Planos" },
            { href: "/relatorios/reservas", label: "Relatório de Reservas" }
          ]
        }
      ]
    }
  ];
  const moduleByHref: Record<string, string> = {
    "/painel": "dashboard",
    "/assistente": "dashboard",
    // WhatsApp é um canal de atendimento. O ícone tem o seu próprio nome,
    // mas a permissão que libera a tela é o módulo de suporte.
    "/whatsapp": "support",
    "/torneios": "tournaments",
    "/jogadores": "players",
    "/players": "players",
    "/duplas": "pairs",
    "/grupos": "groups",
    "/jogos": "matches",
    "/comandas": "pos",
    "/torneios/rankings": "tournaments",
    "/proximos-jogos": "tv",
    "/proximos-jogos/apresentacao": "tv",
    "/proximos-jogos/patrocinios": "tv",
    "/proximos-jogos/tv": "tv",
    "/calendario": "calendar",
    "/agenda": "calendar",
    "/agenda/configuracao": "calendar",
    "/aulas": "lessons",
    "/aulas/alunos": "students",
    "/aulas/registrar": "lessons",
    "/professores": "teachers",
    "/pdv": "pos",
    "/pdv/caixa": "pos",
    "/pdv/estoque": "stock",
    "/pdv/balanco": "stock",
    "/pdv/vendas": "pos",
    "/financeiro": "finance",
    "/financeiro/planos": "finance",
    "/financeiro/mensalidades": "finance",
    "/financeiro/folha": "finance",
    "/financeiro/lancamentos": "finance",
    "/financeiro/contas-a-receber": "finance",
    "/financeiro/contas-a-pagar": "finance",
    "/financeiro/pdv-estoque": "finance",
    "/financeiro/configuracoes": "finance",
    "/financeiro/configuracoes/notas-fiscais": "finance",
    "/financeiro/configuracoes/fornecedores": "finance",
    "/financeiro/configuracoes/categorias-produtos": "finance",
    "/financeiro/configuracoes/formas-pagamento": "finance",
    "/financeiro/configuracoes/contas-bancarias": "finance",
    "/financeiro/configuracoes/cupons": "finance",
    "/financeiro/configuracoes/categorias-financeiras": "finance",
    "/financeiro/configuracoes/pagamentos-online": "finance",
    "/relatorios": "finance",
    "/relatorios/caixa": "finance",
    "/relatorios/lancamentos": "finance",
    "/relatorios/produtos": "finance",
    "/relatorios/estoque": "finance",
    "/relatorios/comandas": "finance",
    "/relatorios/dre": "finance",
    "/relatorios/planos": "finance",
    "/relatorios/reservas": "finance",
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
  const itemIsActive = (item: NavItem): boolean => isActivePath(pathname, item.href) || Boolean(item.children?.some(itemIsActive));
  const activeExpandableItems = filteredGroups.flatMap((group) =>
    group.links.flatMap((item) => [
      ...(item.children?.length && itemIsActive(item) ? [item.href] : []),
      ...(item.children?.flatMap((child) => child.children?.length && itemIsActive(child) ? [child.href] : []) ?? [])
    ])
  );
  const [openItems, setOpenItems] = useState<Set<string>>(() => {
    if (typeof window === "undefined") {
      return new Set(activeExpandableItems);
    }

    const stored = window.localStorage.getItem(openItemsStorageKey);
    if (!stored) {
      return new Set(activeExpandableItems);
    }

    try {
      const parsed = JSON.parse(stored) as string[];
      return new Set(parsed);
    } catch {
      return new Set(activeExpandableItems);
    }
  });

  useEffect(() => {
    setOpenItems((current) => {
      const missingActiveItem = activeExpandableItems.find((href) => !current.has(href));
      if (!missingActiveItem) {
        return current;
      }

      const next = new Set(current);
      activeExpandableItems.forEach((href) => next.add(href));
      return next;
    });
  // Abertura automática ocorre somente ao mudar de página; depois disso o clique sempre prevalece.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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
    <nav className={viewStyles.side_nav} aria-label="Principal">
      {filteredGroups.map((group) => (
        <div className={viewStyles.nav_group} key={group.title}>
          <p className={viewStyles.nav_group_label}>{group.title}</p>
          <div className={viewStyles.nav_group_links}>
            {group.links.map((item) => {
              const isActive = itemIsActive(item);
              const isOpen = openItems.has(item.href);

              return (
                <div className={viewStyles.nav_link_block} key={item.href}>
                  <div className={viewStyles.nav_parent_row}>
                    {item.children?.length ? (
                      <div className={viewStyles.nav_expandable_row}>
                        <Link href={item.href} className={cx(`${viewStyles.nav_link_nav_link_destination}${isActive ? " " + viewStyles.nav_link_active : ""}`)}>
                          <span className={viewStyles.nav_icon} aria-hidden="true">{item.icon ? <NavIcon name={item.icon} /> : null}</span>
                          <span>{item.label}</span>{item.badge ? <b className="nav-unread-badge tw:ml-auto tw:min-w-[17px] tw:rounded-full tw:bg-[#d83932] tw:px-[5px] tw:py-px tw:text-center tw:text-[.62rem] tw:leading-[1.45] tw:text-white" role="status" aria-label={`${item.badge} mensagens não lidas`}>{item.badge > 99 ? "99+" : item.badge}</b> : null}
                        </Link>
                        <button className={viewStyles.nav_toggle_nav_expand_toggle} type="button" aria-label={isOpen ? `Fechar submenu ${item.label}` : `Abrir submenu ${item.label}`} aria-expanded={isOpen} onClick={() => toggleItem(item.href)}>
                          <span className={cx(`${viewStyles.nav_chevron}${isOpen ? " " + viewStyles.nav_chevron_open : ""}`)} aria-hidden="true"><NavIcon name="chevron" /></span>
                        </button>
                      </div>
                    ) : (
                      <Link href={item.href} className={cx(`${viewStyles.nav_link}${isActive ? " " + viewStyles.nav_link_active : ""}${item.href === "/pdv/caixa" ? " nav-link-cash" : ""}`)}>
                        <span className={viewStyles.nav_icon} aria-hidden="true">{item.icon ? <NavIcon name={item.icon} /> : null}</span>
                        <span>{item.label}</span>{item.badge ? <b className="nav-unread-badge tw:ml-auto tw:min-w-[17px] tw:rounded-full tw:bg-[#d83932] tw:px-[5px] tw:py-px tw:text-center tw:text-[.62rem] tw:leading-[1.45] tw:text-white" role="status" aria-label={`${item.badge} mensagens não lidas`}>{item.badge > 99 ? "99+" : item.badge}</b> : null}
                      </Link>
                    )}
                  </div>
                  {item.children?.length ? (
                    <div className={cx(`${viewStyles.nav_submenu}${isOpen ? " " + viewStyles.nav_submenu_open : ""}`)}>
                      {item.children.map((child) => (
                        child.children?.length ? <div className="nav-submenu-block" key={child.href}>
                          <div className={viewStyles.nav_expandable_row_nav_expandable_row_nested}>
                            <Link href={child.href} className={cx(`${viewStyles.nav_sub_link_nav_sub_link_destination}${itemIsActive(child) ? " " + viewStyles.nav_sub_link_active : ""}`)}>{child.label}</Link>
                            <button type="button" className={viewStyles.nav_toggle_nav_expand_toggle} aria-label={openItems.has(child.href) ? `Fechar submenu ${child.label}` : `Abrir submenu ${child.label}`} onClick={() => toggleItem(child.href)} aria-expanded={openItems.has(child.href)}><span className={cx(`${viewStyles.nav_chevron}${openItems.has(child.href) ? " " + viewStyles.nav_chevron_open : ""}`)} aria-hidden="true"><NavIcon name="chevron" /></span></button>
                          </div>
                          <div className={cx(`${viewStyles.nav_submenu_nav_submenu_nested}${openItems.has(child.href) ? " " + viewStyles.nav_submenu_open : ""}`)}>
                            {child.children.map((grandchild) => <Link key={grandchild.href} href={grandchild.href} className={cx(`${viewStyles.nav_sub_link_nav_sub_link_nested}${isActivePath(pathname, grandchild.href) ? " " + viewStyles.nav_sub_link_active : ""}`)}>{grandchild.label}</Link>)}
                          </div>
                        </div> : <Link
                          key={child.href}
                          href={child.href}
                          className={cx(`${viewStyles.nav_sub_link}${isActivePath(pathname, child.href) ? " " + viewStyles.nav_sub_link_active : ""}`)}
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
