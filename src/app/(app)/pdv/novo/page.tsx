import { arenaDatabase } from "@/lib/arena-database";
import { viewStyles } from "./page.utilities";
import Link from "next/link";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { ProductPricingFields } from "@/components/products/product-pricing-fields";
import { createProductAction } from "@/lib/actions/pos";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function NewProductPage() {
  const auth = await requireModuleView("stock");
  const prisma = arenaDatabase(auth.arenaId);
  const categories = await prisma.productCategory.findMany({ where: { arenaId: auth.arenaId, active: true }, orderBy: { name: "asc" } });
  return <div className={viewStyles.product_management_stack_md}><header className={viewStyles.product_management_header}><div><h1>Novo Produto</h1></div><Link href="/pdv/estoque" className={viewStyles.button}>Voltar à listagem</Link></header><SafeActionForm action={createProductAction} className={viewStyles.grid_form} resetOnSuccess successMessage="Produto salvo."><div className={viewStyles.field}><label htmlFor="product-name">Produto</label><input id="product-name" name="name" type="text" placeholder="Ex.: Água sem gás" required /></div><div className={viewStyles.field}><label>Categoria<select name="categoryId"><option value="">Sem categoria</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div><div className={viewStyles.field}><label htmlFor="product-sku">Código/SKU</label><input id="product-sku" name="sku" type="text" /></div><ProductPricingFields /><div className={viewStyles.field}><label htmlFor="product-stock">Estoque inicial</label><input id="product-stock" name="stockQuantity" type="number" min="0" defaultValue="0" /></div><div className={viewStyles.field}><label htmlFor="product-min-stock">Estoque mínimo</label><input id="product-min-stock" name="minStock" type="number" min="0" defaultValue="0" /></div><div className={viewStyles.field_field_submit}><SubmitButton label="Cadastrar produto" pendingLabel="Salvando..." className={viewStyles.button_button_primary} /></div></SafeActionForm></div>;
}
