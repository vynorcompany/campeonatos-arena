"use client";
import { viewStyles } from "./ranking-category-select.utilities";

type Option = { id: string; label: string };

export function RankingCategorySelect({ arenaSlug, options, selectedOptionId }: { arenaSlug: string; options: Option[]; selectedOptionId: string | null }) {
  return <form method="get" className={viewStyles.portal_compact_filter}>
    <input type="hidden" name="arena" value={arenaSlug} />
    <input type="hidden" name="section" value="leagues" />
    <input type="hidden" name="leagueTab" value="ranking" />
    <input type="hidden" name="tab" value="ranking" />
    <label><span>Categoria</span><select name="view" defaultValue={selectedOptionId ?? undefined} onChange={(event) => event.currentTarget.form?.requestSubmit()}>
      {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
    </select></label>
  </form>;
}
