import { SectionCard } from "@/components/section-card";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { adjustStockAction, createProductAction } from "@/lib/actions/pos";
import { requireArenaAccess } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export default async function StockPage() {
  const auth = await requireArenaAccess();
  const products = await prisma.product.findMany({
    where: { arenaId: auth.arenaId },
    orderBy: [{ active: "desc" }, { name: "asc" }]
  });

  return (
    <div className="stack-md">
      <header className="page-header">
        <div className="stack-xs">
          <p className="eyebrow">PDV</p>
          <h1>Estoque</h1>
          <p className="muted">Cadastre produtos, acompanhe mínimo e ajuste entradas, saídas ou contagens.</p>
        </div>
      </header>

      <SectionCard title="Cadastrar produto" description="Produtos cadastrados aparecem na frente de caixa.">
        <SafeActionForm action={createProductAction} className="grid-form" resetOnSuccess successMessage="Produto salvo.">
          <div className="field">
            <label htmlFor="product-name">Produto</label>
            <input id="product-name" name="name" type="text" placeholder="Ex.: Água sem gás" required />
          </div>
          <div className="field">
            <label htmlFor="product-sku">Código/SKU</label>
            <input id="product-sku" name="sku" type="text" />
          </div>
          <div className="field">
            <label htmlFor="product-price">Preço</label>
            <input id="product-price" name="price" type="text" placeholder="12,90" required />
          </div>
          <div className="field">
            <label htmlFor="product-stock">Estoque inicial</label>
            <input id="product-stock" name="stockQuantity" type="number" min="0" defaultValue="0" />
          </div>
          <div className="field">
            <label htmlFor="product-min-stock">Estoque mínimo</label>
            <input id="product-min-stock" name="minStock" type="number" min="0" defaultValue="0" />
          </div>
          <div className="field field-submit">
            <SubmitButton label="Cadastrar produto" pendingLabel="Salvando..." className="button button-primary" />
          </div>
        </SafeActionForm>
      </SectionCard>

      <SectionCard title="Controle de estoque" description="Itens no mínimo aparecem destacados.">
        <table className="data-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Preço</th>
              <th>Estoque</th>
              <th>Mínimo</th>
              <th>Ajuste</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>
                  <strong>{product.name}</strong>
                  <span className="table-subtext">{product.sku || "Sem SKU"}</span>
                </td>
                <td>{formatMoney(product.priceCents)}</td>
                <td>
                  <span className={product.stockQuantity <= product.minStock ? "stock-alert" : ""}>{product.stockQuantity}</span>
                </td>
                <td>{product.minStock}</td>
                <td>
                  <SafeActionForm action={adjustStockAction} className="inline-form stock-adjust-form" successMessage="Estoque ajustado.">
                    <input type="hidden" name="productId" value={product.id} />
                    <select name="type" defaultValue="IN" aria-label="Tipo de ajuste">
                      <option value="IN">Entrada</option>
                      <option value="OUT">Saída</option>
                      <option value="ADJUST">Contagem</option>
                    </select>
                    <input name="quantity" type="number" min="0" defaultValue="1" />
                    <input name="reason" type="text" placeholder="Motivo" />
                    <SubmitButton label="Salvar" pendingLabel="..." className="button" />
                  </SafeActionForm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}
