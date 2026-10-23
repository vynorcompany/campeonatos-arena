import { WorkspaceHeading } from "@/components/ui/workspace-heading";
import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { ProductPricingFields } from "@/components/products/product-pricing-fields";
import { adjustStockAction, createProductAction } from "@/lib/actions/pos";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";

export type StockProduct = { id: string; name: string; sku: string; priceCents: number; stockQuantity: number; minStock: number; active: boolean; category: { name: string } | null };
const columns = "tw:grid-cols-[minmax(0,1fr)_130px_100px_150px] tw:viewport-760:grid-cols-[minmax(0,1fr)_auto] tw:viewport-440:grid-cols-1";
const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export function StockWorkspace({ products, categories, query = "", stock = "", canEdit }: { products: StockProduct[]; categories: { id: string; name: string }[]; query?: string; stock?: string; canEdit: boolean }) {
  const visible = products.filter(product => (!query || product.name.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")) || product.sku.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))) && (stock !== "LOW" || product.stockQuantity <= product.minStock));
  return <div className={`${ui.page} tw:[&_input]:min-h-11 tw:[&_select]:min-h-11`}><WorkspaceHeading eyebrow="PRODUTOS · ESTOQUE" title="Controle de estoque" description="Produtos, disponibilidade e reposição para manter a operação em dia.">{canEdit ? <Link href="/pdv/balanco" className={ui.primary}>Conferir estoque</Link> : null}</WorkspaceHeading>
    {canEdit ? <details className={`stock-create-panel ${ui.panel} tw:open:[&_summary]:mb-4`}>
      <summary className={`${ui.primary} tw:w-fit tw:cursor-pointer tw:list-none tw:[&::-webkit-details-marker]:hidden`}>Novo Produto</summary>
      <SafeActionForm action={createProductAction} className={ui.form} resetOnSuccess closeClosestDetailsOnSuccess successMessage="Produto salvo.">
        <label className={ui.field}>Produto<input name="name" required placeholder="Ex.: Água sem gás" /></label>
        <label className={ui.field}>Categoria<select name="categoryId"><option value="">Sem categoria</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label className={ui.field}>Código/SKU<input name="sku" /></label><ProductPricingFields />
        <label className={ui.field}>Estoque inicial<input name="stockQuantity" type="number" min="0" step="1" defaultValue="0" /></label>
        <label className={ui.field}>Estoque mínimo<input name="minStock" type="number" min="0" step="1" defaultValue="0" /></label>
        <div className="tw:col-span-full tw:flex tw:justify-end"><SubmitButton label="Cadastrar produto" pendingLabel="Salvando..." className={ui.primary} /></div>
      </SafeActionForm>
    </details> : null}
    <div className="tw:grid tw:grid-cols-2 tw:gap-3 tw:viewport-440:grid-cols-1"><div className="tw:flex tw:items-center tw:justify-between tw:rounded-xl tw:bg-[#132d58] tw:p-4 tw:text-white"><span className="tw:text-sm tw:text-[#c4d6ed]">Produtos cadastrados</span><strong className="tw:text-2xl tw:tabular-nums">{products.length}</strong></div><div className="tw:flex tw:items-center tw:justify-between tw:rounded-xl tw:border tw:border-amber-200 tw:bg-amber-50 tw:p-4 tw:text-amber-900"><span className="tw:text-sm">No estoque mínimo</span><strong className="tw:text-2xl tw:tabular-nums">{products.filter(product => product.stockQuantity <= product.minStock).length}</strong></div></div>
    <form method="get" className={`${ui.filters} tw:grid tw:grid-cols-[minmax(200px,1fr)_220px_auto_auto] tw:rounded-xl tw:border tw:border-[var(--line)] tw:bg-[#f7faff] tw:p-4 tw:viewport-1120:grid-cols-2 tw:viewport-440:grid-cols-1`} aria-label="Filtros de estoque"><label className={ui.field}>Pesquisar<input type="search" name="q" defaultValue={query} placeholder="Nome ou SKU" /></label><label className={ui.field}>Estoque<select name="stock" defaultValue={stock}><option value="">Todos os produtos</option><option value="LOW">No estoque mínimo</option></select></label><button className={ui.secondary}>Filtrar</button><Link href="/pdv/estoque" className={ui.secondary}>Limpar</Link></form>
    <div className={ui.list}>
      <div className={`${ui.head} ${columns}`}><span>Produto</span><span>Preço de venda</span><span>Estoque</span><span>Ações</span></div>
      {visible.map(product => {
        const row = <><div><strong>{product.name}</strong><small>{product.sku || "Sem SKU"} · {product.category?.name || "Sem categoria"}{!product.active ? " · Inativo" : ""}</small></div><span className="tw:text-sm">{money(product.priceCents)}</span><div><b className={product.stockQuantity <= product.minStock ? "tw:inline-flex tw:rounded-md tw:bg-amber-50 tw:px-2 tw:py-1 tw:text-sm tw:text-amber-800" : "tw:inline-flex tw:rounded-md tw:bg-emerald-50 tw:px-2 tw:py-1 tw:text-sm tw:text-emerald-800"}>{product.stockQuantity}</b><small>Mínimo: {product.minStock}</small></div><div className="tw:flex tw:flex-wrap tw:gap-2"><Link href={`/pdv/${product.id}`} className={ui.secondary}>{canEdit ? "Editar" : "Ver"}</Link>{canEdit ? <span className={ui.secondary}>Ajustar</span> : null}</div></>;
        return canEdit ? <details key={product.id} className="tw:border-b tw:border-[var(--line)] tw:last:border-b-0"><summary className={`${ui.row} ${columns} tw:cursor-pointer tw:list-none tw:border-b-0 tw:[&::-webkit-details-marker]:hidden`}>{row}</summary><SafeActionForm action={adjustStockAction} className={`${ui.form} tw:mx-4 tw:border-t tw:border-[var(--line)] tw:py-4`} closeClosestDetailsOnSuccess successMessage="Estoque ajustado."><input type="hidden" name="productId" value={product.id} /><label className={ui.field}>Tipo<select name="type" defaultValue="IN"><option value="IN">Entrada</option><option value="OUT">Saída</option><option value="ADJUST">Contagem</option></select></label><label className={ui.field}>Quantidade<input name="quantity" type="number" min="0" step="1" defaultValue="1" /></label><label className={ui.field}>Motivo<input name="reason" required /></label><SubmitButton label="Salvar ajuste" pendingLabel="Salvando..." className={ui.primary} /></SafeActionForm></details>
          : <article key={product.id} className="tw:border-b tw:border-[var(--line)] tw:last:border-b-0"><div className={`${ui.row} ${columns}`}>{row}</div></article>;
      })}
      {!visible.length ? <p className={ui.empty}>{products.length ? "Nenhum produto corresponde aos filtros." : "Nenhum produto cadastrado."}</p> : null}
    </div>
  </div>;
}
