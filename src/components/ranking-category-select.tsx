"use client";

type Option = { id: string; label: string };

export function RankingCategorySelect({ options, selectedOptionId }: { options: Option[]; selectedOptionId: string | null }) {
  return <form method="get" className="portal-compact-filter">
    <input type="hidden" name="section" value="leagues" />
    <input type="hidden" name="leagueTab" value="ranking" />
    <input type="hidden" name="tab" value="ranking" />
    <label><span>Categoria</span><select name="view" defaultValue={selectedOptionId ?? undefined} onChange={(event) => event.currentTarget.form?.requestSubmit()}>
      {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
    </select></label>
  </form>;
}
