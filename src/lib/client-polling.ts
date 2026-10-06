/** One visible, non-overlapping request loop shared by subscribers in the same arena/tab. */
export function createSharedPolling<T>(environment: { visible: () => boolean; fetch: (signal: AbortSignal) => Promise<T | null>; schedule: (callback: () => void, delay: number) => unknown; cancel: (timer: unknown) => void }) {
  const subscribers = new Map<(value: T) => void, number>();
  let timer: unknown, controller: AbortController | null = null, generation = 0, repeats = 0, fingerprint = "";
  const schedule = () => {
    if (!subscribers.size || !environment.visible()) return;
    const base = Math.min(...subscribers.values());
    timer = environment.schedule(() => { timer = undefined; void poll(); }, Math.min(30_000, base * 2 ** Math.min(repeats, 3)));
  };
  const poll = async () => {
    if (controller || !subscribers.size || !environment.visible()) return;
    const epoch = generation;
    controller = new AbortController();
    try {
      const value = await environment.fetch(controller.signal);
      if (epoch !== generation) return;
      if (value) {
        const next = JSON.stringify(value);
        repeats = next === fingerprint ? repeats + 1 : 0;
        fingerprint = next;
        for (const callback of subscribers.keys()) callback(value);
      } else repeats++;
    } catch { if (epoch === generation) repeats++; }
    finally { if (epoch === generation) { controller = null; schedule(); } }
  };
  const wake = () => { if (timer !== undefined) environment.cancel(timer); timer = undefined; repeats = 0; void poll(); };
  return {
    wake,
    subscribe(callback: (value: T) => void, interval: number) {
      subscribers.set(callback, interval); wake();
      return () => {
        subscribers.delete(callback);
        if (!subscribers.size) {
          generation++; controller?.abort(); controller = null;
          if (timer !== undefined) environment.cancel(timer);
          timer = undefined; fingerprint = ""; repeats = 0;
        }
      };
    },
  };
}
