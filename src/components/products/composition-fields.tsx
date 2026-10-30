"use client";
import type { IngredientChoices, ProductComposition } from "@/lib/products/composition-types";
export function CompositionFields({ productName, composition, value, onChange, disabled }: { productName: string; composition?: ProductComposition; value: IngredientChoices; onChange: (choices: IngredientChoices) => void; disabled?: boolean }) {
 if (!composition || (!composition.fixed.length && !composition.groups.length)) return null;
 return <div className="tw:mt-2 tw:grid tw:min-w-0 tw:gap-2" aria-label={`Composição de ${productName}`}>
  {composition.fixed.length ? <small className="tw:block tw:break-words tw:text-[11px] tw:font-normal tw:text-[var(--portal-muted,var(--muted))]">Inclui {composition.fixed.map(row => `${row.quantity}× ${row.name}`).join(" · ")}</small> : null}
  {composition.groups.map(group => <label key={group.id} className="tw:grid tw:min-w-0 tw:gap-1 tw:text-[11px] tw:font-normal"><span>{group.label} <span className="tw:text-[var(--portal-muted,var(--muted))]">· escolha uma opção</span></span><select aria-label={`${group.label} de ${productName}`} value={value[group.id] ?? ""} disabled={disabled} onChange={event => onChange({...value,[group.id]:event.target.value})} className="tw:h-8! tw:min-h-8! tw:w-full tw:min-w-0 tw:rounded-md! tw:border tw:border-[var(--portal-line,var(--line))] tw:bg-[var(--portal-surface,white)] tw:px-2! tw:text-xs! tw:font-normal tw:text-[var(--portal-ink,var(--ink))]"><option value="">Selecione</option>{group.options.map(option => <option key={option.productId} value={option.productId} disabled={!option.available}>{option.name}{option.quantity !== 1 ? ` · ${option.quantity} un.` : ""}{!option.available ? " · indisponível" : ""}</option>)}</select></label>)}
 </div>;
}
