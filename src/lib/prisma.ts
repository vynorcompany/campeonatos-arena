import { PrismaClient } from "@prisma/client";
import { env } from "@/lib/env";

declare global {
  var prisma: PrismaClient | undefined;
}

void env;

export const prisma =
  global.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: env.appDatabaseUrl ?? env.databaseUrl
      }
    },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
