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
    .email("INITIAL_ADMIN_EMAIL inválido."),
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
    const now = new Date();
    const referenceMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

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
      const existingPlayer = await prisma.player.findFirst({
        where: { arenaId: arena.id, name },
        orderBy: { createdAt: "asc" }
      });

      if (existingPlayer) {
        await prisma.player.update({ where: { id: existingPlayer.id }, data: { points, active: true } });
      } else {
        await prisma.player.create({ data: { arenaId: arena.id, name, points } });
      }
    }

    const players = await prisma.player.findMany({
      where: { arenaId: arena.id },
      orderBy: { points: "desc" }
    });

    const teacherSeeds = [
      ["Mariana Torres", "(11) 98111-1201", "mariana@arena.test", 48],
      ["Lucas Freire", "(11) 98222-1202", "lucas@arena.test", 42],
      ["Patricia Gomes", "(11) 98333-1203", "patricia@arena.test", 36],
      ["Eduardo Nery", "(11) 98444-1204", "eduardo@arena.test", 32]
    ] as const;

    for (const [name, phone, email, monthlyTarget] of teacherSeeds) {
      await prisma.teacher.upsert({
        where: { arenaId_name: { arenaId: arena.id, name } },
        update: { phone, email, monthlyTarget, active: true },
        create: { arenaId: arena.id, name, phone, email, monthlyTarget }
      });
    }

    const teachers = await prisma.teacher.findMany({
      where: { arenaId: arena.id },
      orderBy: { name: "asc" }
    });

    const studentSeeds = [
      ["Carlos Mendes", players[0]?.id, "(11) 97001-0001", "carlos@arena.test", 8],
      ["Bruno Lima", players[1]?.id, "(11) 97002-0002", "bruno@arena.test", 6],
      ["Rafael Souza", players[2]?.id, "(11) 97003-0003", "rafael@arena.test", 10],
      ["Felipe Costa", players[3]?.id, "(11) 97004-0004", "felipe@arena.test", 4],
      ["Ana Clara Reis", null, "(11) 97005-0005", "ana@arena.test", 12],
      ["Bianca Duarte", null, "(11) 97006-0006", "bianca@arena.test", 7],
      ["Camila Prado", null, "(11) 97007-0007", "camila@arena.test", 9],
      ["Fernanda Lima", null, "(11) 97008-0008", "fernanda@arena.test", 5],
      ["Guilherme Alves", null, "(11) 97009-0009", "guilherme@arena.test", 11],
      ["Helena Moraes", null, "(11) 97010-0010", "helena@arena.test", 3]
    ] as const;

    for (const [name, playerId, phone, email, remainingClasses] of studentSeeds) {
      await prisma.student.upsert({
        where: { arenaId_name: { arenaId: arena.id, name } },
        update: {
          playerId,
          phone,
          email,
          remainingClasses,
          totalClasses: remainingClasses + 12,
          attendedClasses: 9,
          missedClasses: 2,
          active: true,
          notes: "Cadastro demonstrativo."
        },
        create: {
          arenaId: arena.id,
          playerId,
          name,
          phone,
          email,
          remainingClasses,
          totalClasses: remainingClasses + 12,
          attendedClasses: 9,
          missedClasses: 2,
          notes: "Cadastro demonstrativo."
        }
      });
    }

    const students = await prisma.student.findMany({
      where: { arenaId: arena.id },
      orderBy: { name: "asc" }
    });

    const planSeeds = [
      ["Mensal 4 aulas", 28000, 4],
      ["Mensal 8 aulas", 49000, 8],
      ["Treino livre", 35000, 0],
      ["Performance", 72000, 12]
    ] as const;

    for (const [name, monthlyPriceCents, classesPerMonth] of planSeeds) {
      await prisma.plan.upsert({
        where: { arenaId_name: { arenaId: arena.id, name } },
        update: { monthlyPriceCents, classesPerMonth, active: true },
        create: { arenaId: arena.id, name, monthlyPriceCents, classesPerMonth }
      });
    }

    const plans = await prisma.plan.findMany({
      where: { arenaId: arena.id },
      orderBy: { monthlyPriceCents: "asc" }
    });

    for (const [index, student] of students.slice(0, 8).entries()) {
      const plan = plans[index % plans.length];
      const activeSubscription = await prisma.studentSubscription.findFirst({
        where: { arenaId: arena.id, studentId: student.id, status: "ACTIVE" }
      });

      if (activeSubscription) {
        await prisma.studentSubscription.update({
          where: { id: activeSubscription.id },
          data: {
            planId: plan.id,
            monthlyPriceCents: plan.monthlyPriceCents,
            classesPerMonth: plan.classesPerMonth
          }
        });
      } else {
        await prisma.studentSubscription.create({
          data: {
            arenaId: arena.id,
            studentId: student.id,
            planId: plan.id,
            monthlyPriceCents: plan.monthlyPriceCents,
            classesPerMonth: plan.classesPerMonth,
            dueDay: 5 + (index % 4) * 5,
            startedAt: monthStart,
            notes: "Assinatura demonstrativa."
          }
        });
      }
    }

    await prisma.lesson.deleteMany({
      where: { arenaId: arena.id, notes: { contains: "demo" } }
    });

    for (let index = 0; index < 14; index++) {
      const teacher = teachers[index % teachers.length];
      const lessonStudents = students.slice(index % 5, (index % 5) + 3);
      const scheduledAt = new Date(now.getFullYear(), now.getMonth(), Math.min(24, 2 + index), 8 + (index % 5), 0);
      const isPaid = index % 3 === 0;

      await prisma.lesson.create({
        data: {
          arenaId: arena.id,
          teacherId: teacher.id,
          title: index % 2 === 0 ? "Aula em dupla" : "Treino técnico",
          scheduledAt,
          durationMinutes: index % 2 === 0 ? 60 : 90,
          status: index < 9 ? "COMPLETED" : "SCHEDULED",
          priceCents: isPaid ? 14000 : 0,
          paymentMethod: isPaid ? "PIX" : "",
          paidAt: isPaid ? scheduledAt : null,
          notes: "demo aula seed",
          attendances: {
            create: lessonStudents.map((student, studentIndex) => ({
              studentId: student.id,
              status: studentIndex === 2 && index % 4 === 0 ? "ABSENT" : "PRESENT"
            }))
          }
        }
      });
    }

    const productSeeds = [
      ["Água sem gás", "AGUA-500", 500, 80, 20],
      ["Água com gás", "AGUAG-500", 600, 60, 15],
      ["Isotônico", "ISO-001", 1200, 45, 12],
      ["Energético", "ENER-001", 1500, 35, 10],
      ["Bola de padel", "BOLA-003", 4200, 30, 8],
      ["Overgrip", "GRIP-001", 3500, 28, 6],
      ["Munhequeira", "MUN-001", 2900, 18, 5],
      ["Camiseta Arena", "CAM-ARENA", 8900, 22, 5],
      ["Raquete iniciante", "RAQ-INI", 49900, 6, 2],
      ["Barra de proteína", "BAR-PROT", 1100, 50, 15]
    ] as const;

    for (const [name, sku, priceCents, stockQuantity, minStock] of productSeeds) {
      await prisma.product.upsert({
        where: { arenaId_name: { arenaId: arena.id, name } },
        update: { sku, priceCents, stockQuantity, minStock, active: true },
        create: { arenaId: arena.id, name, sku, priceCents, stockQuantity, minStock }
      });
    }

    const products = await prisma.product.findMany({
      where: { arenaId: arena.id },
      orderBy: { name: "asc" }
    });

    await prisma.stockMovement.deleteMany({
      where: { arenaId: arena.id, reason: { contains: "Demo" } }
    });

    for (const product of products.slice(0, 8)) {
      await prisma.stockMovement.create({
        data: {
          arenaId: arena.id,
          productId: product.id,
          type: "IN",
          quantity: 12,
          reason: "Demo reposição de estoque"
        }
      });
    }

    for (let index = 0; index < 8; index++) {
      const firstProduct = products[index % products.length];
      const secondProduct = products[(index + 3) % products.length];
      const saleCode = `DEMO-${referenceMonth}-${String(index + 1).padStart(2, "0")}`;
      const totalCents = firstProduct.priceCents * 2 + secondProduct.priceCents;
      const sale = await prisma.sale.upsert({
        where: { code: saleCode },
        update: {
          customerName: students[index % students.length].name,
          paymentMethod: index % 2 === 0 ? "PIX" : "CREDIT_CARD",
          totalCents
        },
        create: {
          arenaId: arena.id,
          code: saleCode,
          customerName: students[index % students.length].name,
          paymentMethod: index % 2 === 0 ? "PIX" : "CREDIT_CARD",
          totalCents,
          createdAt: new Date(now.getFullYear(), now.getMonth(), Math.min(25, 4 + index), 18, 0)
        }
      });

      await prisma.saleItem.deleteMany({ where: { saleId: sale.id } });
      await prisma.saleItem.createMany({
        data: [
          {
            saleId: sale.id,
            productId: firstProduct.id,
            quantity: 2,
            unitPriceCents: firstProduct.priceCents,
            totalCents: firstProduct.priceCents * 2
          },
          {
            saleId: sale.id,
            productId: secondProduct.id,
            quantity: 1,
            unitPriceCents: secondProduct.priceCents,
            totalCents: secondProduct.priceCents
          }
        ]
      });
    }

    await prisma.financialEntry.deleteMany({
      where: { arenaId: arena.id, notes: { contains: "demo financeiro" } }
    });

    const financialSeeds = [
      ["EXPENSE", "Aluguel", "Aluguel das quadras", 720000, "PAID"],
      ["EXPENSE", "Energia", "Conta de energia", 185000, "PAID"],
      ["EXPENSE", "Marketing", "Campanha local", 65000, "PENDING"],
      ["EXPENSE", "Manutenção", "Reparo de iluminação", 94000, "PAID"],
      ["REVENUE", "Evento", "Clínica de fim de semana", 180000, "PAID"],
      ["REVENUE", "Aulas avulsas", "Aulas particulares demonstrativas", 42000, "PAID"]
    ] as const;

    for (const [type, category, description, amountCents, status] of financialSeeds) {
      await prisma.financialEntry.create({
        data: {
          arenaId: arena.id,
          type,
          category,
          description,
          amountCents,
          paymentMethod: status === "PAID" ? "PIX" : "",
          status,
          dueDate: new Date(now.getFullYear(), now.getMonth(), 10),
          paidAt: status === "PAID" ? new Date(now.getFullYear(), now.getMonth(), 10) : null,
          notes: "demo financeiro"
        }
      });
    }

    for (const teacher of teachers) {
      await prisma.teacherPayrollEntry.upsert({
        where: { teacherId_referenceMonth: { teacherId: teacher.id, referenceMonth } },
        update: {
          fixedSalaryCents: 180000,
          classValueCents: 4500,
          bonusCents: 12000,
          discountCents: 0,
          status: "PENDING",
          notes: "Folha demonstrativa."
        },
        create: {
          arenaId: arena.id,
          teacherId: teacher.id,
          referenceMonth,
          fixedSalaryCents: 180000,
          classValueCents: 4500,
          bonusCents: 12000,
          discountCents: 0,
          status: "PENDING",
          notes: "Folha demonstrativa."
        }
      });
    }
  }

  console.log(`Seed concluido. Admin: ${admin.email}. Arena: ${arena.name}.`);
}

function formatSeedError(error: unknown) {
  if (error instanceof z.ZodError) {
    const messages = error.issues.map((issue) => `- ${issue.message}`).join("\n");
    return `Seed não executado. Configure as variáveis obrigatórias no .env ou no ambiente:\n${messages}`;
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
