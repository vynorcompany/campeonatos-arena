"use client";
import { useEffect, useRef } from "react";
import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./tournament-tabs.utilities";
import Link from "next/link";
import { LeagueIcon, type LeagueIconName } from "@/components/tournaments/league-icon";

const tabs = [
  { key: "overview", label: "Visão geral", icon: "grid" },
  { key: "registrations", label: "Inscrições", icon: "users" },
  { key: "groups", label: "Grupos", icon: "groups" },
  { key: "games", label: "Jogos", icon: "ball" },
  { key: "results", label: "Resultados", icon: "trophy" },
  { key: "history", label: "Histórico", icon: "history" },
] as const satisfies ReadonlyArray<{ key: string; label: string; icon: LeagueIconName }>;

export type TournamentTabKey = (typeof tabs)[number]["key"];

export function TournamentTabs({
  tournamentId,
  categoryId,
  activeTab,
  availableTabs,
}: {
  tournamentId: string;
  categoryId: string;
  activeTab: TournamentTabKey;
  availableTabs?: readonly TournamentTabKey[];
}) {
  const navigation = useRef<HTMLElement>(null);
  useEffect(() => {
    const container = navigation.current;
    const active = container?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!container || !active) return;
    const viewport = container.getBoundingClientRect(), item = active.getBoundingClientRect();
    if (item.left < viewport.left || item.right > viewport.right) container.scrollLeft += item.left - viewport.left - (viewport.width - item.width) / 2;
  }, [activeTab]);
  return (
    <nav ref={navigation} className={viewStyles.t_tabs} aria-label="Etapas da categoria">
      {tabs.filter((tab) => !availableTabs || availableTabs.includes(tab.key)).map((tab) => (
        <Link
          key={tab.key}
          aria-current={activeTab === tab.key ? "page" : undefined}
          href={`/torneios/${tournamentId}/categorias/${categoryId}?tab=${tab.key}`}
          className={cx(`${viewStyles.t_tab} ${activeTab === tab.key ? viewStyles.t_tab_active : ""}`)}
        >
          <span className="t-tab-icon"><LeagueIcon name={tab.icon} /></span>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
