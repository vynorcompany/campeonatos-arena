"use client";
import { useState } from "react";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { updateStockAggregatesAction } from "@/lib/actions/pos";

type Group = { id: string; label: string; options: Row[] };
type Row = { productId: string; quantity: number };
export function StockAggregatesEditor({ productId, products, initial, initialGroups = [] }: { productId: string; products: { id: string; name: string }[]; initial: Row[]; initialGroups?: Group[] }) {
  const [rows, setRows] = useState(initial);
  const [groups,setGroups] = useState(initialGroups);
  const patchGroup = (index:number,patch:Partial<Group>) => setGroups(current => current.map((group,at) => at === index ? {...group,...patch} : group));
  return <SafeActionForm action={updateStockAggregatesAction} className="tw:grid tw:min-w-0 tw:gap-3" successMessage="Produtos agregados salvos.">
    <input type="hidden" name="productId" value={productId} /><input type="hidden" name="stockChoices" value={JSON.stringify(groups)} /><input type="hidden" name="stockAggregates" value={JSON.stringify(rows)} />
    <p className="tw:m-0 tw:text-xs tw:text-[var(--muted)]">Quantidade baixada junto com cada unidade vendida. O preço do produto permanece o mesmo.</p>
    {rows.map((row, index) => <div key={index} className="tw:grid tw:min-w-0 tw:grid-cols-[minmax(0,1fr)_100px_30px] tw:items-end tw:gap-2 tw:viewport-440:grid-cols-[minmax(0,1fr)_30px]">
      <label className={`${ui.field} tw:viewport-440:col-span-full`}>Produto agregado<select required value={row.productId} onChange={event => setRows(rows.map((item, at) => at === index ? { ...item, productId: event.target.value } : item))}><option value="">Selecione</option>{products.filter(product => product.id === row.productId || !rows.some(item => item.productId === product.id)).map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
      <label className={ui.field}>Quantidade<input type="number" min="1" max="999" step="1" required value={row.quantity || ""} onChange={event => setRows(rows.map((item, at) => at === index ? { ...item, quantity: Number(event.target.value) } : item))} /></label>
      <button type="button" className={`${ui.secondary} tw:size-8 tw:px-0! tw:text-red-700!`} aria-label={`Remover agregado ${index + 1}`} onClick={() => setRows(rows.filter((_, at) => at !== index))}><svg viewBox="0 0 24 24" className="tw:size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M6 18 18 6" /></svg></button>
    </div>)}
    {groups.map((group,index) => <fieldset key={group.id} className="tw:m-0 tw:grid tw:min-w-0 tw:gap-3 tw:rounded-md tw:border tw:border-[var(--line)] tw:p-3"><legend className="tw:px-1 tw:text-xs tw:font-medium">Escolha obrigatória</legend>
      <div className="tw:flex tw:min-w-0 tw:items-end tw:gap-2"><label className={`${ui.field} tw:flex-1`}>Nome do grupo<input required maxLength={60} placeholder="Ex.: Acompanhamento" value={group.label} onChange={event => patchGroup(index,{label:event.target.value})} /></label><button type="button" className={ui.secondary} aria-label={`Remover grupo ${index+1}`} onClick={() => setGroups(groups.filter((_,at) => at!==index))}>Remover</button></div>
      {group.options.map((option,at) => <div key={at} className="tw:grid tw:min-w-0 tw:grid-cols-[minmax(0,1fr)_90px_30px] tw:items-end tw:gap-2 tw:viewport-440:grid-cols-[minmax(0,1fr)_30px]"><label className={`${ui.field} tw:viewport-440:col-span-full`}>Alternativa {at+1}<select required value={option.productId} onChange={event => patchGroup(index,{options:group.options.map((row,i) => i===at ? {...row,productId:event.target.value} : row)})}><option value="">Selecione</option>{products.filter(product => product.id===option.productId || !group.options.some(row => row.productId===product.id)).map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><label className={ui.field}>Quantidade<input required type="number" min="1" max="999" value={option.quantity || ""} onChange={event => patchGroup(index,{options:group.options.map((row,i) => i===at ? {...row,quantity:Number(event.target.value)} : row)})}/></label><button type="button" className={`${ui.secondary} tw:px-0! tw:text-red-700!`} disabled={group.options.length<=2} aria-label={`Remover alternativa ${at+1} do grupo ${index+1}`} onClick={() => patchGroup(index,{options:group.options.filter((_,i) => i!==at)})}>×</button></div>)}
      <button type="button" className={`${ui.secondary} tw:justify-self-start`} disabled={group.options.length>=10} onClick={() => patchGroup(index,{options:[...group.options,{productId:"",quantity:1}]})}>Adicionar alternativa</button>
    </fieldset>)}
    <button type="button" className={`${ui.secondary} tw:justify-self-start`} disabled={groups.length>=10 || products.length<2} onClick={() => setGroups([...groups,{id:crypto.randomUUID(),label:"",options:[{productId:"",quantity:1},{productId:"",quantity:1}]}])}>Adicionar grupo de escolha</button>
    <div className="tw:flex tw:flex-wrap tw:justify-between tw:gap-2 tw:border-t tw:border-[var(--line)] tw:pt-3"><button type="button" className={ui.secondary} disabled={rows.length >= 20 || rows.length >= products.length} onClick={() => setRows([...rows, { productId: "", quantity: 1 }])}>Adicionar agregado</button><SubmitButton label="Salvar agregados" pendingLabel="Salvando..." className={ui.primary} /></div>
  </SafeActionForm>;
}
