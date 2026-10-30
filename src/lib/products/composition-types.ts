export type CompositionOption = { productId: string; name: string; quantity: number; available: boolean };
export type ProductComposition = { fixed: CompositionOption[]; groups: { id: string; label: string; options: CompositionOption[] }[] };
export type IngredientChoices = Record<string, string>;
export const compositionCartKey = (productId: string, choices: IngredientChoices = {}) => JSON.stringify([productId, Object.entries(choices).sort(([a], [b]) => a.localeCompare(b))]);
export const compositionComplete = (composition: ProductComposition | undefined, choices: IngredientChoices = {}) => !composition?.groups.some(group => !group.options.some(option => option.productId === choices[group.id] && option.available));
export const compositionChoiceLabel = (composition: ProductComposition | undefined, choices: IngredientChoices = {}) => composition?.groups.map(group => group.options.find(option => option.productId === choices[group.id])?.name).filter(Boolean).join(" · ") || "";
