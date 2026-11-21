export const CATEGORY_CLASS_OPTIONS = ["3ª", "4ª", "5ª", "6ª", "7ª"] as const;

export const CATEGORY_GENDER_OPTIONS = [
  { value: "FEMININO", label: "Feminino" },
  { value: "MASCULINO", label: "Masculino" },
  { value: "MISTA", label: "Mista" },
] as const;

export function isCategoryGender(value: string) {
  return CATEGORY_GENDER_OPTIONS.some(option => option.value === value);
}
