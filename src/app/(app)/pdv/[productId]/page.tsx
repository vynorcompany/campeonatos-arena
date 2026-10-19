import { arenaDatabase } from "@/lib/arena-database";
import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SectionCard } from "@/components/section-card";
import { SubmitButton } from "@/components/forms/submit-button";
import { ProductPricingFields } from "@/components/products/product-pricing-fields";
import { StockHistoryDialog } from "@/components/products/stock-history-dialog";
import { adjustStockAction, updateProductAction } from "@/lib/actions/pos";
import { requireModuleView } from "@/lib/auth/guards";
import { canEditModule } from "@/lib/permissions";

export default async function ProductDetailPage(props: { params: Promise<{ productId: string }> }) {
  const params = await props.params;
  const auth = await requireModuleView("stock");
  const canEdit = canEditModule("stock", auth.arenaRole, auth.systemRole, auth.editPermissions);
  const prisma = arenaDatabase(auth.arenaId);
  const [product, categories] = await Promise.all([
    prisma.product.findFirst({ where: { id: params.productId, arenaId: auth.arenaId }, include: { stockMovements: { orderBy: { createdAt: "desc" }, take: 8 } } }),
    prisma.productCategory.findMany({ where: { arenaId: auth.arenaId, active: true }, orderBy: { name: "asc" } })
  ]);
  if (!product) notFound();
  return <div className={viewStyles.product_management_stack_md}>
    <header className={viewStyles.product_management_header}><div><h1>{product.name}</h1><p>{product.sku || "Sem código interno"}</p></div><Link href="/pdv/estoque" className={viewStyles.button}>Voltar ao estoque</Link></header>
    <SectionCard title="Dados do produto">{canEdit ? <SafeActionForm action={updateProductAction} className={viewStyles.grid_form} successMessage="Produto atualizado."><input type="hidden" name="productId" value={product.id} /><input type="hidden" name="stockQuantity" value={product.stockQuantity} /><div className={viewStyles.field}><label>Produto<input name="name" defaultValue={product.name} required /></label></div><div className={viewStyles.field}><label>Categoria<select name="categoryId" defaultValue={product.categoryId ?? ""}><option value="">Sem categoria</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div><div className={viewStyles.field}><label>Código/SKU<input name="sku" defaultValue={product.sku} /></label></div><ProductPricingFields priceCents={product.priceCents} costCents={product.costCents} /><div className={viewStyles.field}><label>Estoque mínimo<input name="minStock" type="number" min="0" defaultValue={product.minStock} /></label></div><div className={viewStyles.field_field_submit}><SubmitButton label="Salvar alterações" pendingLabel="Salvando..." className={viewStyles.button_button_primary} /></div></SafeActionForm> :
      <dl className="tw:grid tw:gap-3 tw:sm:grid-cols-2 tw:lg:grid-cols-3">{[
        ["Produto", product.name], ["Código/SKU", product.sku || "Sem código interno"],
        ["Estoque atual", String(product.stockQuantity)], ["Estoque mínimo", String(product.minStock)],
        ["Preço de venda", new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(product.priceCents / 100)]
      ].map(([label, value]) => <div key={label} className="tw:min-w-0 tw:rounded-lg tw:border tw:border-[#dce7f2] tw:p-3"><dt className="tw:text-xs tw:text-[#607898]">{label}</dt><dd className="tw:mt-1 tw:break-words tw:font-semibold tw:text-[#132d58]">{value}</dd></div>)}</dl>}
    </SectionCard>
    <SectionCard title={canEdit ? "Ajuste de estoque" : "Histórico de estoque"}>
      {canEdit ? <SafeActionForm action={adjustStockAction} className={viewStyles.grid_form} successMessage="Estoque ajustado."><input type="hidden" name="productId" value={product.id} /><div className={viewStyles.field}><label>Tipo<select name="type" defaultValue="IN"><option value="IN">Entrada</option><option value="OUT">Saída</option><option value="ADJUST">Contagem</option></select></label></div><div className={viewStyles.field}><label>Quantidade<input name="quantity" type="number" min="0" defaultValue="1" /></label></div><div className={viewStyles.field}><label>Motivo<input name="reason" placeholder="Ex.: inventário" /></label></div><div className={viewStyles.field_field_submit}><SubmitButton label="Registrar ajuste" pendingLabel="Salvando..." className={viewStyles.button_button_primary} /></div></SafeActionForm> : null}
      <StockHistoryDialog movements={product.stockMovements.map((movement) => ({ id: movement.id, type: movement.type, quantity: movement.quantity, reason: movement.reason, createdAt: movement.createdAt.toISOString() }))} />
    </SectionCard>
    {canEdit ? <SectionCard title="Configurações NFC-e"><p className={viewStyles.muted}>A configuração fiscal deste produto será conectada ao módulo de notas fiscais da arena.</p></SectionCard> : null}
  </div>;
}
