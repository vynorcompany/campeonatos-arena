import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@arena.local" },
    update: {
      name: "Administrador Arena",
      passwordHash
    },
    create: {
      name: "Administrador Arena",
      email: "admin@arena.local",
      passwordHash,
      systemRole: "SUPER_ADMIN"
    }
  });

  const arena = await prisma.arena.upsert({
    where: { slug: "arena-central-padel" },
    update: {},
    create: {
      name: "Arena Central Padel",
      slug: "arena-central-padel",
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

  const activeTournament = await prisma.tournament.findFirst({
    where: {
      arenaId: arena.id,
      status: {
        in: ["DRAFT", "READY_FOR_DRAW", "GROUPS_DEFINED", "MATCHES_DEFINED", "IN_PROGRESS"]
      }
    }
  });

  if (!activeTournament) {
    await prisma.tournament.create({
      data: {
        arenaId: arena.id,
        name: "Torneio de Abertura",
        status: "DRAFT",
        groupCount: 4
      }
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
