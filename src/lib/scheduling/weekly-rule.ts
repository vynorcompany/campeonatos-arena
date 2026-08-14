export function weeklyRangesOverlap(
  firstStartMinute: number,
  firstEndMinute: number,
  secondStartMinute: number,
  secondEndMinute: number
) {
  return firstStartMinute < secondEndMinute && firstEndMinute > secondStartMinute;
}
