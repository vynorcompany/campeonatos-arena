import { SectionCard } from "@/components/section-card";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { adjustStockAction, createProductAction } from "@/lib/actions/pos";
import { requireModuleView } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(cents / 100);
}

export default async function PosPage() {
  const auth = await requireModuleView("pos");
  const products = await prisma.product.findMany({
    where: { arenaId: auth.arenaId },
    orderBy: [{ active: "desc" }, { name: "asc" }]
  });

  return (
    <div className="product-management stack-md">
      <header className="product-management-header">
        <h1>Produtos e Serviços</h1>
        <div className="product-management-actions">
          <button type="button" className="button button-import" disabled title="Importação de nota será disponibilizada em breve">Importar nota de compra</button>
          <button type="button" className="button button-import-csv" disabled title="Importação CSV será disponibilizada em breve">Importar CSV</button>
          <a href="#novo-produto" className="button button-primary">Criar produto/serviço</a>
        </div>
      </header>

      <section className="product-management-filters" aria-label="Filtros de produtos">
        <header><strong>Filtros</strong><div><button type="button" className="button button-small button-primary">Aplicar filtros</button><button type="button" className="button button-small">Limpar</button></div></header>
        <div>
          <label>Descrição<input placeholder="Nome do produto" /></label>
          <label>Código interno<input placeholder="SKU/código" /></label>
          <label>Categoria<select defaultValue=""><option value="">Todas as categorias</option></select></label>
          <label>Estoque<select defaultValue=""><option value="">Todos os níveis</option><option value="low">Abaixo do mínimo</option><option value="available">Disponível</option></select></label>
          <label className="control-toggle"><input type="checkbox" defaultChecked /><span aria-hidden="true" /><em>Ativo</em></label>
        </div>
      </section>

      <SectionCard id="novo-produto" title="Cadastrar produto" description="Produtos cadastrados aparecem na frente de caixa e no controle de estoque.">
        <SafeActionForm action={createProductAction} className="grid-form" resetOnSuccess successMessage="Produto salvo.">
          <div className="field">
            <label htmlFor="product-name">Produto</label>
            <input id="product-name" name="name" type="text" placeholder="Ex.: Agua sem gas" required />
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

      <SectionCard id="estoque" title="Listagem" description="Produtos e serviços cadastrados, com estoque e ajustes operacionais.">
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
                      <option value="OUT">Saida</option>
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
