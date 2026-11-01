/** Include the zero baseline and negative net results on the same monetary axis. */
export function cashChartScale(days: Array<{ income: number; expense: number }>, reference = 0) {
  const values = days.flatMap(day => [day.income, day.expense, day.income - day.expense]);
  const min = Math.min(0, ...values), max = Math.max(1, reference, ...values);
  const range = max - min;
  return { min, max, position: (value: number) => (max - value) / range, ticks: [max, max - range / 2, min] };
}
