import type { Prisma, PrismaClient } from "@prisma/client";
import { getAuditRequestContext, type AuditRequestContext } from "./request-context";

type Transaction = Prisma.TransactionClient;
type Operation = (tx: Transaction) => Promise<unknown>;
const writes = new Set(["create", "createMany", "createManyAndReturn", "update", "updateMany", "updateManyAndReturn", "upsert", "delete", "deleteMany"]);

/** Attribute committed mutations without changing the caller's tenant/RLS scope. */
export function auditedDatabase(base: PrismaClient): PrismaClient {
  const operations = new WeakMap<object, Operation>();
  const scoped = (run: Operation, context: AuditRequestContext, options?: object) => base.$transaction(async tx => {
    await tx.$executeRaw`SELECT set_config('app.audit_actor_id', ${context.actorId ?? "ANONYMOUS"}, true), set_config('app.audit_actor_name', ${context.actorName ?? "Não autenticado"}, true), set_config('app.audit_parent_request', ${context.requestId ?? ""}, true), set_config('app.audit_arena_id', ${context.arenaId ?? ""}, true)`;
    return run(tx);
  }, options);
  const defer = (operation: Operation, context: AuditRequestContext) => {
    let result: Promise<unknown> | undefined;
    const execute = () => result ??= scoped(operation, context);
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
        const context = getAuditRequestContext();
        if (!context) return (base.$transaction as any)(input, options);
        if (typeof input === "function") return scoped(input, context, options);
        const batch = input.map(item => {
          const operation = operations.get(item);
          if (!operation) throw new Error("A transação deve usar operações do mesmo cliente de banco.");
          return operation;
        });
        return scoped(tx => Promise.all(batch.map(operation => operation(tx))), context, options);
      };
      const value = Reflect.get(target, key);
      if (typeof key === "string" && key.startsWith("$")) {
        if (["$queryRaw", "$queryRawUnsafe", "$executeRaw", "$executeRawUnsafe"].includes(key)) return (...args: unknown[]) => {
          const context = getAuditRequestContext();
          const operation: Operation = tx => (tx as any)[key](...args);
          if (context) return defer(operation, context);
          const result = (value as Function).apply(base, args);
          operations.set(result, operation);
          return result;
        };
        return typeof value === "function" ? value.bind(base) : value;
      }
      if (!value || typeof value !== "object") return value;
      if (!delegates.has(key)) delegates.set(key, new Proxy(value, {
        get(delegate, method) {
          const member = Reflect.get(delegate, method);
          if (typeof member !== "function") return member;
          return (...args: unknown[]) => {
            const operation: Operation = tx => (tx as any)[key][method](...args);
            const context = getAuditRequestContext();
            if (context && writes.has(String(method))) return defer(operation, context);
            const result = member.apply(delegate, args);
            if (result && typeof result === "object") operations.set(result, operation);
            return result;
          };
        }
      }));
      return delegates.get(key);
    }
  }) as PrismaClient;
}
