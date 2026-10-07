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
import { prisma } from "@/lib/prisma";

export default async function ProductDetailPage(props: { params: Promise<{ productId: string }> }) {
  const params = await props.params;
  const auth = await requireModuleView("pos");
  const prisma = arenaDatabase(auth.arenaId);
  const [product, categories] = await Promise.all([
    prisma.product.findFirst({ where: { id: params.productId, arenaId: auth.arenaId }, include: { stockMovements: { orderBy: { createdAt: "desc" }, take: 8 } } }),
    prisma.productCategory.findMany({ where: { arenaId: auth.arenaId, active: true }, orderBy: { name: "asc" } })
  ]);
  if (!product) notFound();
  return <div className={viewStyles.product_management_stack_md}><header className={viewStyles.product_management_header}><div><h1>{product.name}</h1><p>{product.sku || "Sem código interno"}</p></div><Link href="/pdv" className={viewStyles.button}>Voltar à listagem</Link></header><SectionCard title="Dados do produto"><SafeActionForm action={updateProductAction} className={viewStyles.grid_form} successMessage="Produto atualizado."><input type="hidden" name="productId" value={product.id} /><input type="hidden" name="stockQuantity" value={product.stockQuantity} /><div className={viewStyles.field}><label>Produto<input name="name" defaultValue={product.name} required /></label></div><div className={viewStyles.field}><label>Categoria<select name="categoryId" defaultValue={product.categoryId ?? ""}><option value="">Sem categoria</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div><div className={viewStyles.field}><label>Código/SKU<input name="sku" defaultValue={product.sku} /></label></div><ProductPricingFields priceCents={product.priceCents} costCents={product.costCents} /><div className={viewStyles.field}><label>Estoque mínimo<input name="minStock" type="number" min="0" defaultValue={product.minStock} /></label></div><div className={viewStyles.field_field_submit}><SubmitButton label="Salvar alterações" pendingLabel="Salvando..." className={viewStyles.button_button_primary} /></div></SafeActionForm></SectionCard><SectionCard title="Ajuste de estoque"><SafeActionForm action={adjustStockAction} className={viewStyles.grid_form} successMessage="Estoque ajustado."><input type="hidden" name="productId" value={product.id} /><div className={viewStyles.field}><label>Tipo<select name="type" defaultValue="IN"><option value="IN">Entrada</option><option value="OUT">Saída</option><option value="ADJUST">Contagem</option></select></label></div><div className={viewStyles.field}><label>Quantidade<input name="quantity" type="number" min="0" defaultValue="1" /></label></div><div className={viewStyles.field}><label>Motivo<input name="reason" placeholder="Ex.: inventário" /></label></div><div className={viewStyles.field_field_submit}><SubmitButton label="Registrar ajuste" pendingLabel="Salvando..." className={viewStyles.button_button_primary} /></div></SafeActionForm><StockHistoryDialog movements={product.stockMovements.map((movement) => ({ id: movement.id, type: movement.type, quantity: movement.quantity, reason: movement.reason, createdAt: movement.createdAt.toISOString() }))} /></SectionCard><SectionCard title="Configurações NFC-e"><p className={viewStyles.muted}>A configuração fiscal deste produto será conectada ao módulo de notas fiscais da arena.</p></SectionCard></div>;
}
