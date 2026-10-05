import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./page.utilities";
import { SectionCard } from "@/components/section-card";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { adjustStockAction, createProductAction } from "@/lib/actions/pos";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export default async function StockPage() {
  const auth = await requireModuleView("stock");
  const products = await prisma.product.findMany({
    where: { arenaId: auth.arenaId },
    include: { category: { select: { name: true } } },
    orderBy: [{ active: "desc" }, { name: "asc" }]
  });
  const lowStockCount = products.filter((product) => product.stockQuantity <= product.minStock).length;

  return (
    <div className={viewStyles.stack_md}>
      <h1 className={viewStyles.sr_only}>Estoque</h1>
      <header className={viewStyles.page_header_stock_management_header}>
        <div className={viewStyles.stock_management_metrics}><span><b>{products.length}</b> produtos</span><span className={cx(lowStockCount ? viewStyles.is_attention : "")}><b>{lowStockCount}</b> no mínimo</span></div>
      </header>

      <SectionCard title="Cadastrar produto" description="Produtos cadastrados aparecem na frente de caixa.">
        <SafeActionForm action={createProductAction} className={viewStyles.grid_form} resetOnSuccess successMessage="Produto salvo.">
          <div className={viewStyles.field}>
            <label htmlFor="product-name">Produto</label>
            <input id="product-name" name="name" type="text" placeholder="Ex.: Água sem gás" required />
          </div>
          <div className={viewStyles.field}>
            <label htmlFor="product-sku">Código/SKU</label>
            <input id="product-sku" name="sku" type="text" />
          </div>
          <div className={viewStyles.field}>
            <label htmlFor="product-price">Preço</label>
            <input id="product-price" name="price" type="text" placeholder="12,90" required />
          </div>
          <div className={viewStyles.field}>
            <label htmlFor="product-stock">Estoque inicial</label>
            <input id="product-stock" name="stockQuantity" type="number" min="0" defaultValue="0" />
          </div>
          <div className={viewStyles.field}>
            <label htmlFor="product-min-stock">Estoque mínimo</label>
            <input id="product-min-stock" name="minStock" type="number" min="0" defaultValue="0" />
          </div>
          <div className={viewStyles.field_field_submit}>
            <SubmitButton label="Cadastrar produto" pendingLabel="Salvando..." className={viewStyles.button_button_primary} />
          </div>
        </SafeActionForm>
      </SectionCard>

      <SectionCard title="Controle de estoque" description="Itens no mínimo aparecem destacados. Ajustes ficam agrupados em cada linha.">
        <div className={viewStyles.stock_operational_list}><div className={viewStyles.stock_operational_head}><span>Produto</span><span>Categoria</span><span>Preço</span><span>Estoque</span><span>Ajuste</span></div>{products.map((product) => <article className={viewStyles.stock_operational_row} key={product.id}><div><strong>{product.name}</strong><small>{product.sku || "Sem SKU"}</small></div><span>{product.category?.name || "Sem categoria"}</span><span>{formatMoney(product.priceCents)}</span><div><b className={cx(product.stockQuantity <= product.minStock ? viewStyles.stock_alert : "")}>{product.stockQuantity}</b><small>mínimo: {product.minStock}</small></div><SafeActionForm action={adjustStockAction} className={viewStyles.stock_row_adjust} successMessage="Estoque ajustado."><input type="hidden" name="productId" value={product.id} /><select name="type" defaultValue="IN" aria-label="Tipo de ajuste"><option value="IN">Entrada</option><option value="OUT">Saída</option><option value="ADJUST">Contagem</option></select><input name="quantity" type="number" min="0" defaultValue="1" aria-label="Quantidade" /><input name="reason" type="text" placeholder="Motivo" /><SubmitButton label="Salvar" pendingLabel="..." className={viewStyles.button_button_small} /></SafeActionForm></article>)}{!products.length ? <p className={viewStyles.client_empty}>Nenhum produto cadastrado.</p> : null}</div>
      </SectionCard>
    </div>
  );
}
