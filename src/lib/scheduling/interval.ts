export function intervalsOverlap(
  firstStartsAt: Date,
  firstEndsAt: Date,
  secondStartsAt: Date,
  secondEndsAt: Date
) {
  return firstStartsAt < secondEndsAt && firstEndsAt > secondStartsAt;
}
