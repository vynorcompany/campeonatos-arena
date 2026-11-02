import "server-only";
// @ts-expect-error shared plain-Node deployment module
import { authenticationDatabaseUrl } from "../../../scripts/lib/auth-database.mjs";
import { PrismaClient } from "@prisma/client";
import { prisma as runtime } from "@/lib/prisma";
import { auditedDatabase } from "@/lib/audit/database-client";

// Cross-arena identity lookup is isolated from the operational database role.
// This role has no access to reservations, products, receivables or payments.
const authUrl = process.env.AUTH_DATABASE_URL || (process.env.APP_DATABASE_URL ? authenticationDatabaseUrl(process.env.APP_DATABASE_URL) : undefined);
if (authUrl && decodeURIComponent(new URL(authUrl).username) !== "arena_auth") throw new Error("A autenticação exige a conexão arena_auth.");
const registry = globalThis as unknown as { arenaAuthDatabase?: PrismaClient };
export const authDatabase = authUrl ? (registry.arenaAuthDatabase ??= auditedDatabase(new PrismaClient({ datasources: { db: { url: authUrl } } }))) : runtime;
if (process.env.NODE_ENV === "production" && process.env.APP_DATABASE_URL && !authUrl) throw new Error("A conexão restrita de autenticação é obrigatória.");

export const prisma = authDatabase;

const agencyUrl = process.env.AGENCY_DATABASE_URL || (process.env.APP_DATABASE_URL ? authenticationDatabaseUrl(process.env.APP_DATABASE_URL, "agency") : undefined);
if (agencyUrl && decodeURIComponent(new URL(agencyUrl).username) !== "arena_agency") throw new Error("A agência exige a conexão arena_agency.");
const agencyRegistry = globalThis as unknown as { arenaAgencyDatabase?: PrismaClient };
export const agencyDatabase = agencyUrl ? (agencyRegistry.arenaAgencyDatabase ??= auditedDatabase(new PrismaClient({ datasources: { db: { url: agencyUrl } } }))) : runtime;
if (process.env.NODE_ENV === "production" && process.env.APP_DATABASE_URL && !agencyUrl) throw new Error("A conexão da agência é obrigatória.");
