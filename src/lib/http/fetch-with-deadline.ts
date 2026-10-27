/** Keep provider stalls bounded without retrying operations that may already have succeeded. */
export function fetchWithDeadline(
  fetcher: typeof fetch,
  input: string | URL | Request,
  init: RequestInit = {},
  timeoutMs = 25_000,
) {
  const deadline = AbortSignal.timeout(timeoutMs);
  const inherited = init.signal ?? (typeof input !== "string" && "signal" in input ? input.signal : null);
  const signal = inherited ? AbortSignal.any([inherited, deadline]) : deadline;
  return fetcher(input, { ...init, signal });
}
