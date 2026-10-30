import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { ProductEditorTabs } from "@/components/products/product-editor-tabs";
import { ProductFiscalForm } from "@/components/products/product-fiscal-form";
import { compositionIds, readStockChoices } from "@/lib/products/composition";
import { StockAggregatesEditor } from "@/components/products/stock-aggregates-editor";
import { readStockAggregates } from "@/lib/products/stock-aggregates";
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
import { canEditModule, canPerformPermission } from "@/lib/permissions";

export default async function ProductDetailPage(props: {
  params: Promise<{ productId: string }>;
  searchParams?: Promise<{ aba?: string }>;
}) {
  const params = await props.params;
  const search = await props.searchParams;
  const auth = await requireModuleView("stock");
  const canEdit = canEditModule(
    "stock",
    auth.arenaRole,
    auth.systemRole,
    auth.editPermissions,
  );
  const prisma = arenaDatabase(auth.arenaId);
  const [product, categories, aggregateProducts, issuer] = await Promise.all([
    prisma.product.findFirst({
      where: { id: params.productId, arenaId: auth.arenaId },
      include: { stockMovements: { orderBy: { createdAt: "desc" }, take: 8 } },
    }),
    prisma.productCategory.findMany({
      where: { arenaId: auth.arenaId, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: {
        arenaId: auth.arenaId,
        isService: false,
        active: true,
        id: { not: params.productId },
      },
      select: {
        id: true,
        name: true,
        stockAggregates: true,
        stockChoices: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.fiscalSettings.findUnique({
      where: { arenaId: auth.arenaId },
      select: { crt: true, issuerState: true },
    }),
  ]);
  if (!product) notFound();
  return (
    <div className={viewStyles.product_management_stack_md}>
      <header className={ui.toolbar}>
        <h1 className="tw:sr-only">Editar produto</h1>
        <span className="tw:min-w-0 tw:break-words tw:text-sm tw:font-medium tw:text-[#174983]">
          {product.name}
        </span>
        <Link href="/pdv/estoque" className={ui.secondary}>
          Voltar ao estoque
        </Link>
      </header>
      <ProductEditorTabs
        initialTab={search?.aba}
        panels={[
          {
            id: "dados",
            label: "Dados e preços",
            content: (
              <SectionCard title="Dados do produto" hideHeading>
                {canEdit ? (
                  <SafeActionForm
                    action={updateProductAction}
                    className="tw:grid tw:gap-3"
                    successMessage="Produto atualizado."
                  >
                    <input type="hidden" name="productId" value={product.id} />
                    <input
                      type="hidden"
                      name="stockQuantity"
                      value={product.stockQuantity}
                    />
                    <div className={viewStyles.grid_form}>
                      <label className={viewStyles.field}>
                        Produto
                        <input
                          name="name"
                          defaultValue={product.name}
                          required
                        />
                      </label>
                      <label className={viewStyles.field}>
                        Categoria
                        <select
                          name="categoryId"
                          defaultValue={product.categoryId ?? ""}
                        >
                          <option value="">Sem categoria</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className={viewStyles.field}>
                        Código/SKU
                        <input name="sku" defaultValue={product.sku} />
                      </label>
                    </div>
                    <div className={viewStyles.grid_form}>
                      <ProductPricingFields
                        priceCents={product.priceCents}
                        costCents={product.costCents}
                      />
                      <label className={viewStyles.field}>
                        Estoque mínimo
                        <input
                          name="minStock"
                          type="number"
                          min="0"
                          defaultValue={product.minStock}
                        />
                      </label>
                    </div>
                    <label className={viewStyles.field}>
                      Observações
                      <textarea
                        name="notes"
                        defaultValue={product.notes}
                        maxLength={2000}
                        rows={3}
                        className="tw:min-h-24 tw:w-full tw:resize-y"
                      />
                    </label>
                    <footer className="tw:col-span-full tw:flex tw:justify-end tw:border-t tw:border-[var(--line)] tw:pt-3">
                      <SubmitButton
                        label="Salvar alterações"
                        pendingLabel="Salvando..."
                        className={viewStyles.button_button_primary}
                      />
                    </footer>
                  </SafeActionForm>
                ) : (
                  <dl className="tw:grid tw:gap-3 tw:sm:grid-cols-2 tw:lg:grid-cols-3">
                    {[
                      ["Produto", product.name],
                      ["Código/SKU", product.sku || "Sem código interno"],
                      ["Estoque atual", String(product.stockQuantity)],
                      ["Estoque mínimo", String(product.minStock)],
                      [
                        "Preço de venda",
                        new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(product.priceCents / 100),
                      ],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="tw:min-w-0 tw:rounded-lg tw:border tw:border-[#dce7f2] tw:p-3"
                      >
                        <dt className="tw:text-xs tw:text-[#607898]">
                          {label}
                        </dt>
                        <dd className="tw:mt-1 tw:break-words tw:font-semibold tw:text-[#132d58]">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </SectionCard>
            ),
          },
          ...(canEdit && !product.isService
            ? [
                {
                  id: "composicao",
                  label: "Composição",
                  content: (
                    <SectionCard title="Produtos agregados" hideHeading>
                      <StockAggregatesEditor
                        productId={product.id}
                        initial={readStockAggregates(product.stockAggregates)}
                        initialGroups={readStockChoices(product.stockChoices)}
                        products={aggregateProducts.filter(
                          (item) => !compositionIds(item).length,
                        )}
                      />
                    </SectionCard>
                  ),
                },
              ]
            : []),
          {
            id: "estoque",
            label: "Estoque",
            content: (
              <SectionCard title="Estoque" hideHeading>
                <div className="tw:flex tw:flex-wrap tw:items-center tw:justify-between tw:gap-2 tw:border-b tw:border-[var(--line)] tw:pb-3 tw:text-xs">
                  <span>
                    Estoque atual: {product.stockQuantity} · Mínimo:{" "}
                    {product.minStock}
                  </span>
                  <StockHistoryDialog
                    movements={product.stockMovements.map((movement) => ({
                      ...movement,
                      createdAt: movement.createdAt.toISOString(),
                    }))}
                  />
                </div>
                {canEdit ? (
                  <SafeActionForm
                    action={adjustStockAction}
                    className={viewStyles.grid_form}
                    successMessage="Estoque ajustado."
                  >
                    <input type="hidden" name="productId" value={product.id} />
                    <label className={viewStyles.field}>
                      Tipo
                      <select name="type" defaultValue="IN">
                        <option value="IN">Entrada</option>
                        <option value="OUT">Saída</option>
                        <option value="ADJUST">Contagem</option>
                      </select>
                    </label>
                    <label className={viewStyles.field}>
                      Quantidade
                      <input
                        name="quantity"
                        type="number"
                        min="0"
                        defaultValue="1"
                      />
                    </label>
                    <label className={viewStyles.field}>
                      Motivo
                      <input name="reason" placeholder="Ex.: inventário" />
                    </label>
                    <footer className="tw:col-span-full tw:flex tw:justify-end tw:border-t tw:border-[var(--line)] tw:pt-3">
                      <SubmitButton
                        label="Registrar ajuste"
                        pendingLabel="Salvando..."
                        className={viewStyles.button_button_primary}
                      />
                    </footer>
                  </SafeActionForm>
                ) : null}
              </SectionCard>
            ),
          },
          ...(!product.isService
            ? [
                {
                  id: "fiscal",
                  label: "Fiscal",
                  content: (
                    <ProductFiscalForm
                      productId={product.id}
                      initial={product.fiscalProfile}
                      issuer={issuer ?? {}}
                      canEdit={canEdit}
                      canConfigureIssuer={canPerformPermission(
                        "finance:settings:manage",
                        auth.arenaRole,
                        auth.systemRole,
                        auth.editPermissions,
                      )}
                    />
                  ),
                },
              ]
            : []),
        ]}
      />
    </div>
  );
}
