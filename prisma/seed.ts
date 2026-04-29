import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { existsSync } from "node:fs";
import { z } from "zod";

if (typeof process.loadEnvFile === "function" && existsSync(".env")) {
  process.loadEnvFile(".env");
}

const prisma = new PrismaClient();

const seedEnvSchema = z.object({
  INITIAL_ADMIN_NAME: z.string({ required_error: "INITIAL_ADMIN_NAME obrigatorio." }).trim().min(2, "INITIAL_ADMIN_NAME obrigatorio."),
  INITIAL_ADMIN_EMAIL: z
    .string({ required_error: "INITIAL_ADMIN_EMAIL obrigatorio." })
    .trim()
    .email("INITIAL_ADMIN_EMAIL invalido."),
  INITIAL_ADMIN_PASSWORD: z
    .string({ required_error: "INITIAL_ADMIN_PASSWORD obrigatorio." })
    .min(10, "INITIAL_ADMIN_PASSWORD deve ter no minimo 10 caracteres."),
  INITIAL_ARENA_NAME: z.string({ required_error: "INITIAL_ARENA_NAME obrigatorio." }).trim().min(2, "INITIAL_ARENA_NAME obrigatorio."),
  INITIAL_ARENA_SLUG: z
    .string({ required_error: "INITIAL_ARENA_SLUG obrigatorio." })
    .trim()
    .min(2, "INITIAL_ARENA_SLUG obrigatorio.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "INITIAL_ARENA_SLUG deve usar apenas letras minusculas, numeros e hifens."),
  SEED_DEMO_DATA: z.enum(["true", "false"]).default("false")
});

async function main() {
  const env = seedEnvSchema.parse(process.env);
  const passwordHash = await bcrypt.hash(env.INITIAL_ADMIN_PASSWORD, 12);

  const admin = await prisma.user.upsert({
    where: { email: env.INITIAL_ADMIN_EMAIL },
    update: {
      name: env.INITIAL_ADMIN_NAME,
      passwordHash
    },
    create: {
      name: env.INITIAL_ADMIN_NAME,
      email: env.INITIAL_ADMIN_EMAIL,
      passwordHash,
      systemRole: "SUPER_ADMIN"
    }
  });

  const arena = await prisma.arena.upsert({
    where: { slug: env.INITIAL_ARENA_SLUG },
    update: {
      name: env.INITIAL_ARENA_NAME
    },
    create: {
      name: env.INITIAL_ARENA_NAME,
      slug: env.INITIAL_ARENA_SLUG,
      createdById: admin.id
    }
  });

  await prisma.arenaMember.upsert({
    where: {
      userId_arenaId: {
        userId: admin.id,
        arenaId: arena.id
      }
    },
    update: {
      role: "OWNER"
    },
    create: {
      role: "OWNER",
      userId: admin.id,
      arenaId: arena.id
    }
  });

  if (env.SEED_DEMO_DATA === "true") {
    const playerSeeds = [
      ["Carlos Mendes", 1920],
      ["Bruno Lima", 1840],
      ["Rafael Souza", 1790],
      ["Felipe Costa", 1710],
      ["Anderson Melo", 1665],
      ["Thiago Rocha", 1600],
      ["Daniel Alves", 1540],
      ["Gustavo Nunes", 1490],
      ["Murilo Prado", 1435],
      ["Leandro Brito", 1380],
      ["Renato Viana", 1325],
      ["Caio Teles", 1270],
      ["Victor Ramos", 1210],
      ["Diego Matos", 1140],
      ["Joao Xavier", 1095],
      ["Igor Fonseca", 1030]
    ] as const;

    for (const [name, points] of playerSeeds) {
      await prisma.player.upsert({
        where: {
          arenaId_name: {
            arenaId: arena.id,
            name
          }
        },
        update: { points, active: true },
        create: {
          arenaId: arena.id,
          name,
          points
        }
      });
    }
  }

  console.log(`Seed concluido. Admin: ${admin.email}. Arena: ${arena.name}.`);
}

function formatSeedError(error: unknown) {
  if (error instanceof z.ZodError) {
    const messages = error.issues.map((issue) => `- ${issue.message}`).join("\n");
    return `Seed nao executado. Configure as variaveis obrigatorias no .env ou no ambiente:\n${messages}`;
  }

  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  return String(error);
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(formatSeedError(error));
    await prisma.$disconnect();
    process.exit(1);
  });
