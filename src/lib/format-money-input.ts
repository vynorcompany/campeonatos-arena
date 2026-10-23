/** Format cents for an editable BRL amount on either server or client. */
export function formatMoneyInput(cents: number) {
  return (Math.max(0, cents) / 100).toFixed(2).replace(".", ",");
}
