"use client";
import { PortalChoice } from "@/components/portal/portal-choice";
import { viewStyles } from "./ranking-category-select.utilities";

type Option = { id: string; label: string };

export function RankingCategorySelect({ arenaSlug, options, selectedOptionId, compact = false }: { arenaSlug: string; options: Option[]; selectedOptionId: string | null; compact?: boolean }) {
  if (!options.length) return null;
  return <form method="get" className={compact ? "tw:max-w-sm tw:min-w-0" : viewStyles.portal_compact_filter}>
    <input type="hidden" name="arena" value={arenaSlug} />
    <input type="hidden" name="section" value="leagues" />
    <input type="hidden" name="leagueTab" value="ranking" />
    <input type="hidden" name="tab" value="ranking" />
    <PortalChoice compact={compact} queryParam={compact ? "view" : undefined} label="Categoria do ranking" name="view" defaultValue={selectedOptionId ?? ""} options={options.map(option => ({ value: option.id, label: option.label }))} />
  </form>;
}
