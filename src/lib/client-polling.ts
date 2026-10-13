/** One visible, non-overlapping request loop shared by subscribers in the same arena/tab. */
export function createSharedPolling<T>(environment: { visible: () => boolean; fetch: (signal: AbortSignal) => Promise<T | null>; schedule: (callback: () => void, delay: number) => unknown; cancel: (timer: unknown) => void }, requestTimeoutMs = 10_000) {
  const subscribers = new Map<(value: T) => void, { interval: number; steady: boolean }>();
  let timer: unknown, controller: AbortController | null = null, generation = 0, repeats = 0, failures = 0, fingerprint = "";
  const schedule = () => {
    if (!subscribers.size || !environment.visible()) return;
    const base = Math.min(...[...subscribers.values()].map((subscriber) => subscriber.interval));
    const steady = [...subscribers.values()].some((subscriber) => subscriber.steady);
    timer = environment.schedule(() => { timer = undefined; void poll(); }, Math.min(30_000, base * 2 ** Math.min(steady ? failures : repeats, 3)));
  };
  const poll = async () => {
    if (controller || !subscribers.size || !environment.visible()) return;
    const epoch = generation;
    const requestController = new AbortController();
    controller = requestController;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    try {
      const value = await Promise.race([
        environment.fetch(requestController.signal),
        new Promise<null>((resolve) => {
          watchdog = setTimeout(() => { requestController.abort(); resolve(null); }, requestTimeoutMs);
        }),
      ]);
      if (epoch !== generation) return;
      if (value) {
        const next = JSON.stringify(value);
        repeats = next === fingerprint ? repeats + 1 : 0;
        failures = 0;
        fingerprint = next;
        for (const callback of subscribers.keys()) callback(value);
      } else { repeats++; failures++; }
    } catch { if (epoch === generation) { repeats++; failures++; } }
    finally {
      if (watchdog !== undefined) clearTimeout(watchdog);
      if (epoch === generation) { controller = null; schedule(); }
    }
  };
  const wake = () => { if (timer !== undefined) environment.cancel(timer); timer = undefined; repeats = 0; failures = 0; void poll(); };
  return {
    wake,
    subscribe(callback: (value: T) => void, interval: number, steady = false) {
      subscribers.set(callback, { interval, steady }); wake();
      return () => {
        subscribers.delete(callback);
        if (!subscribers.size) {
          generation++; controller?.abort(); controller = null;
          if (timer !== undefined) environment.cancel(timer);
          timer = undefined; fingerprint = ""; repeats = 0; failures = 0;
        }
      };
    },
  };
}
