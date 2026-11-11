export const PAGE_SIZES = [20, 50, 100] as const;
export function paginationInput(input: { page?: unknown; pageSize?: unknown } = {}) {
  const size = Number(input.pageSize);
  const pageSize = PAGE_SIZES.includes(size as 20 | 50 | 100) ? size : 20;
  const requested = Number(input.page);
  const page = Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, 100_000) : 1;
  return { page, pageSize, skip: (page - 1) * pageSize };
}
export function paginationRange(total: number, page: number, pageSize: number) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.max(1, Math.min(page, pages));
  return { page: current, pages, from: total ? (current - 1) * pageSize + 1 : 0, to: Math.min(current * pageSize, total) };
}
