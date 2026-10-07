import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma as base } from "@/lib/prisma";

type Transaction = Prisma.TransactionClient;
type Operation = (tx: Transaction) => Promise<unknown>;

/** Explicit tenant client. Context is transaction-local and never shared between requests. */
export function arenaDatabase(arenaId: string): PrismaClient {
  if (!arenaId.trim()) throw new Error("A arena ativa é obrigatória.");
  const operations = new WeakMap<object, Operation>();
  const scoped = <T>(run: (tx: Transaction) => Promise<T>, options?: object) => base.$transaction(async tx => {
    await tx.$executeRaw`SELECT set_config('app.arena_id', ${arenaId}, true)`;
    return run(tx);
  }, options);
  const defer = (operation: Operation) => {
    // Remain lazy, including when collected into an atomic batch transaction.
    let result: Promise<unknown> | undefined;
    const execute = () => result ??= scoped(operation);
    const promise = {
      then: (...args: Parameters<Promise<unknown>["then"]>) => execute().then(...args),
      catch: (...args: Parameters<Promise<unknown>["catch"]>) => execute().catch(...args),
      finally: (...args: Parameters<Promise<unknown>["finally"]>) => execute().finally(...args),
      [Symbol.toStringTag]: "PrismaPromise"
    };
    operations.set(promise, operation);
    return promise;
  };
  const delegates = new Map<PropertyKey, unknown>();
  return new Proxy(base, {
    get(target, key) {
      if (key === "$transaction") return (input: Operation | object[], options?: object) => {
        if (typeof input === "function") return scoped(input, options);
        const batch = input.map(item => {
          const operation = operations.get(item);
          if (!operation) throw new Error("A transação deve usar somente operações da mesma arena.");
          return operation;
        });
        return scoped(tx => Promise.all(batch.map(operation => operation(tx))), options);
      };
      if (typeof key === "string" && key.startsWith("$")) {
        if (["$queryRaw", "$queryRawUnsafe", "$executeRaw", "$executeRawUnsafe"].includes(key)) return (...args: unknown[]) => defer(tx => (tx as any)[key](...args));
        throw new Error("Operação administrativa indisponível no cliente da arena.");
      }
      if (!delegates.has(key)) {
        const delegate = Reflect.get(target, key);
        if (!delegate || typeof delegate !== "object") return delegate;
        delegates.set(key, new Proxy(delegate, { get(_delegate, method) {
          return (...args: unknown[]) => defer(tx => (tx as any)[key][method](...args));
        } }));
      }
      return delegates.get(key);
    }
  }) as PrismaClient;
}
