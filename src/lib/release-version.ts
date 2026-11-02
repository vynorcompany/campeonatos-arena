/** Accept only a release identifier; never expose arbitrary environment content. */
export function releaseRevision(value: unknown): string | null {
  return typeof value === "string" && /^(?:[a-f0-9]{12}|[a-f0-9]{40})$/i.test(value) ? value.slice(0, 12).toLowerCase() : null;
}
