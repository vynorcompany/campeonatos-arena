"use client";

import { useState } from "react";
import { MoneyInput } from "@/components/forms/money-input";

export function ProductPricingFields({ priceCents = 0, costCents = 0 }: { priceCents?: number; costCents?: number }) {
  const [cost, setCost] = useState(costCents);
  const [price, setPrice] = useState(priceCents);
  const [margin, setMargin] = useState(() => priceCents > 0 ? Math.max(0, ((priceCents - costCents) / priceCents) * 100).toFixed(2).replace(".", ",") : "");
  const changeMargin = (value: string) => {
    setMargin(value);
    const percent = Number(value.replace(",", "."));
    if (cost > 0 && percent >= 0 && percent < 100) setPrice(Math.round(cost / (1 - percent / 100)));
  };
  return <><div className="field"><label>Preço de custo<MoneyInput name="cost" valueCents={cost} onValueCentsChange={setCost} required /></label></div><div className="field"><label>Margem desejada (%)<input name="margin" inputMode="decimal" value={margin} onChange={(event) => changeMargin(event.target.value)} placeholder="Ex.: 35" /></label></div><div className="field"><label>Preço de venda<MoneyInput name="price" valueCents={price} onValueCentsChange={setPrice} required /></label></div></>;
}
