/** Convert viewport pointer distances to layout pixels under inherited CSS zoom. */
export function elementVisualScale(element: HTMLElement): number {
  let scale = 1;
  for (let current: HTMLElement | null = element; current; current = current.parentElement) {
    const zoom = Number.parseFloat(window.getComputedStyle(current).zoom);
    if (Number.isFinite(zoom) && zoom > 0) scale *= zoom;
  }
  return scale;
}
