"use client";
import { viewStyles } from "./product-pricing-fields.utilities";

import { useState } from "react";
import { CurrencyInput } from "@/components/forms/currency-input";

export function ProductPricingFields({
  priceCents = 0,
  costCents = 0,
}: {
  priceCents?: number;
  costCents?: number;
}) {
  const [cost, setCost] = useState(costCents);
  const [price, setPrice] = useState(priceCents);
  const [margin, setMargin] = useState(() =>
    priceCents > 0
      ? Math.max(0, ((priceCents - costCents) / priceCents) * 100)
          .toFixed(2)
          .replace(".", ",")
      : "",
  );
  const changeMargin = (value: string) => {
    setMargin(value);
    const percent = Number(value.replace(",", "."));
    if (cost > 0 && percent >= 0 && percent < 100)
      setPrice(Math.round(cost / (1 - percent / 100)));
  };
  return (
    <>
      <label className={viewStyles.field}>
        Preço de custo
        <CurrencyInput
          name="cost"
          valueCents={cost}
          onValueCentsChange={setCost}
          required
        />
      </label>
      <label className={viewStyles.field}>
        Margem desejada (%)
        <input
          name="margin"
          inputMode="decimal"
          value={margin}
          onChange={(event) => changeMargin(event.target.value)}
          placeholder="Ex.: 35"
        />
      </label>
      <label className={viewStyles.field}>
        Preço de venda
        <CurrencyInput
          name="price"
          valueCents={price}
          onValueCentsChange={setPrice}
          required
        />
      </label>
    </>
  );
}
