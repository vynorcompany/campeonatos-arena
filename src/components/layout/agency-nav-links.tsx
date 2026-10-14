"use client";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./agency-nav-links.utilities";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { usePersistedOpenItems } from "./use-persisted-open-items";

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
      { href: "/agencia/planos", label: "Planos e assinaturas" },
      {
        href: "/agencia/arenas",
        label: "Arenas",
        children: [
          { href: "/agencia/arenas", label: "Todas as arenas" },
          { href: "/agencia/arenas/usuarios", label: "Usuários das arenas" }
        ]
      }
      , { href: "/agencia/conexoes", label: "Conexões" }
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
  const pathname = usePathname() ?? "";
  const [mobileOpen, setMobileOpen] = useState(false);
  const openItemsStorageKey = "arena:agency-sidebar-open-items";
  const initialOpenItems = groups.flatMap((group) =>
    group.links.filter((item) => isActivePath(pathname, item.href)).map((item) => item.href)
  );
  const [openItems, setOpenItems] = usePersistedOpenItems(openItemsStorageKey, initialOpenItems);

  useEffect(() => {
    const activeParent = groups
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
  }, [pathname]);

  return (
    <nav className={cx(`${viewStyles.agency_nav}${mobileOpen ? " agency-nav-mobile-open" : ""}`)} aria-label="Agência">
      <button type="button" className={viewStyles.agency_mobile_menu_toggle} aria-label={mobileOpen ? "Fechar menu da agência" : "Abrir menu da agência"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)}>
        <span>{mobileOpen ? "Fechar menu" : "Abrir menu da agência"}</span>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={mobileOpen ? "M5 5l14 14M19 5 5 19" : "M4 7h16M4 12h16M4 17h16"} /></svg>
      </button>
      {groups.map((group) => (
        <div className={viewStyles.nav_group} key={group.title}>
          <p className={viewStyles.nav_group_label}>{group.title}</p>
          <div className={viewStyles.nav_group_links}>
            {group.links.map((item) => {
              const isOpen = openItems.has(item.href) || isActivePath(pathname, item.href);
              const isActive = pathname === item.href;

              return (
                <div className={viewStyles.nav_link_block} key={item.href}>
                  <div className={viewStyles.nav_parent_row}>
                    <Link href={item.href} onClick={() => setMobileOpen(false)} className={cx(`${viewStyles.nav_link}${isActive ? " " + viewStyles.nav_link_active : ""}`)}>
                      <span>{item.label}</span>
                    </Link>
                    {item.children?.length ? (
                      <button
                        className={viewStyles.nav_toggle}
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
                    <div className={cx(`${viewStyles.nav_submenu}${isOpen ? " " + viewStyles.nav_submenu_open : ""}`)}>
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setMobileOpen(false)}
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
