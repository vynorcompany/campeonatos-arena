import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { ProductPricingFields } from "@/components/products/product-pricing-fields";
import { adjustStockAction, createProductAction } from "@/lib/actions/pos";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";

export type StockProduct = { id: string; name: string; sku: string; priceCents: number; stockQuantity: number; minStock: number; active: boolean; category: { name: string } | null };
const columns = "tw:grid-cols-[minmax(0,1fr)_130px_100px_150px] tw:viewport-760:grid-cols-[minmax(0,1fr)_auto] tw:viewport-440:grid-cols-1";
const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export function StockWorkspace({ products, categories, query = "", stock = "" }: { products: StockProduct[]; categories: { id: string; name: string }[]; query?: string; stock?: string }) {
  const visible = products.filter(product => (!query || product.name.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")) || product.sku.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))) && (stock !== "LOW" || product.stockQuantity <= product.minStock));
  return <div className={ui.page}><h1 className="tw:sr-only">Estoque</h1>
    <details className={`stock-create-panel ${ui.panel} tw:open:[&_summary]:mb-4`}>
      <summary className={`${ui.primary} tw:w-fit tw:cursor-pointer tw:list-none tw:[&::-webkit-details-marker]:hidden`}>Novo Produto</summary>
      <SafeActionForm action={createProductAction} className={ui.form} resetOnSuccess closeClosestDetailsOnSuccess successMessage="Produto salvo.">
        <label className={ui.field}>Produto<input name="name" required placeholder="Ex.: Água sem gás" /></label>
        <label className={ui.field}>Categoria<select name="categoryId"><option value="">Sem categoria</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label className={ui.field}>Código/SKU<input name="sku" /></label><ProductPricingFields />
        <label className={ui.field}>Estoque inicial<input name="stockQuantity" type="number" min="0" step="1" defaultValue="0" /></label>
        <label className={ui.field}>Estoque mínimo<input name="minStock" type="number" min="0" step="1" defaultValue="0" /></label>
        <div className="tw:col-span-full tw:flex tw:justify-end"><SubmitButton label="Cadastrar produto" pendingLabel="Salvando..." className={ui.primary} /></div>
      </SafeActionForm>
    </details>
    <div className={ui.toolbar}><p>{products.length} produtos · {products.filter(product => product.stockQuantity <= product.minStock).length} no estoque mínimo</p><Link href="/pdv/balanco" className={ui.secondary}>Criar balanço</Link></div>
    <form method="get" className={`${ui.filters} tw:grid tw:grid-cols-[minmax(0,1fr)_auto_auto_auto] tw:viewport-760:grid-cols-2 tw:viewport-440:grid-cols-1`} aria-label="Filtros de estoque"><label className={ui.field}>Pesquisar<input type="search" name="q" defaultValue={query} placeholder="Nome ou SKU" /></label><label className={ui.field}>Estoque<select name="stock" defaultValue={stock}><option value="">Todos os produtos</option><option value="LOW">No estoque mínimo</option></select></label><button className={ui.secondary}>Filtrar</button><Link href="/pdv/estoque" className={ui.secondary}>Limpar</Link></form>
    <div className={ui.list}><div className={`${ui.head} ${columns}`}><span>Produto</span><span>Preço de venda</span><span>Estoque</span><span>Ações</span></div>{visible.map(product => <details key={product.id} className="tw:border-b tw:border-[var(--line)] tw:last:border-b-0"><summary className={`${ui.row} ${columns} tw:cursor-pointer tw:list-none tw:border-b-0 tw:[&::-webkit-details-marker]:hidden`}><div><strong>{product.name}</strong><small>{product.sku || "Sem SKU"} · {product.category?.name || "Sem categoria"}{!product.active ? " · Inativo" : ""}</small></div><span className="tw:text-sm">{money(product.priceCents)}</span><div><b className={product.stockQuantity <= product.minStock ? "tw:text-amber-700" : "tw:text-sm"}>{product.stockQuantity}</b><small>Mínimo: {product.minStock}</small></div><div className="tw:flex tw:flex-wrap tw:gap-2"><Link href={`/pdv/${product.id}`} className={ui.secondary}>Editar</Link><span className={ui.secondary}>Ajustar</span></div></summary><SafeActionForm action={adjustStockAction} className={`${ui.form} tw:mx-4 tw:border-t tw:border-[var(--line)] tw:py-4`} closeClosestDetailsOnSuccess successMessage="Estoque ajustado."><input type="hidden" name="productId" value={product.id} /><label className={ui.field}>Tipo<select name="type" defaultValue="IN"><option value="IN">Entrada</option><option value="OUT">Saída</option><option value="ADJUST">Contagem</option></select></label><label className={ui.field}>Quantidade<input name="quantity" type="number" min="0" step="1" defaultValue="1" /></label><label className={ui.field}>Motivo<input name="reason" required /></label><SubmitButton label="Salvar ajuste" pendingLabel="Salvando..." className={ui.primary} /></SafeActionForm></details>)}{!visible.length ? <p className={ui.empty}>{products.length ? "Nenhum produto corresponde aos filtros." : "Nenhum produto cadastrado."}</p> : null}</div>
  </div>;
}
