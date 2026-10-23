"use client";

import { useCallback, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { operationalWorkspace as ui } from "@/components/ui/operational-workspace";
import { SafeActionForm } from "@/components/forms/safe-action-form";
import { SubmitButton } from "@/components/forms/submit-button";
import { ProductPricingFields } from "./product-pricing-fields";
import { createProductAction } from "@/lib/actions/pos";

export function NewProductDialog({ categories }: { categories: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return <><button type="button" className={ui.primary} onClick={() => setOpen(true)}>Novo Produto</button><Modal title="Novo produto" open={open} onClose={close}><SafeActionForm action={createProductAction} onSuccess={close} successMessage="Produto salvo." className="tw:grid tw:grid-cols-2 tw:gap-3 tw:viewport-440:grid-cols-1 tw:[&_input]:h-9! tw:[&_input]:min-h-9! tw:[&_select]:h-9! tw:[&_select]:min-h-9! tw:[&_label]:text-xs! tw:[&_input]:text-[13px]!">
    <label className={`${ui.field} tw:col-span-full`}>Produto<input name="name" required placeholder="Ex.: Água sem gás" /></label><label className={ui.field}>Categoria<select name="categoryId"><option value="">Sem categoria</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className={ui.field}>Código/SKU<input name="sku" /></label>
    <ProductPricingFields /><label className={ui.field}>Estoque inicial<input name="stockQuantity" type="number" min="0" step="1" defaultValue="0" /></label><label className={ui.field}>Estoque mínimo<input name="minStock" type="number" min="0" step="1" defaultValue="0" /></label><div className="tw:col-span-full tw:flex tw:justify-end tw:gap-2 tw:border-t tw:border-[var(--line)] tw:pt-3"><button type="button" className={ui.secondary} onClick={close}>Cancelar</button><SubmitButton label="Cadastrar produto" pendingLabel="Salvando..." className={ui.primary} /></div>
  </SafeActionForm></Modal></>;
}
