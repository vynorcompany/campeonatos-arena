"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireModuleEdit } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const optionalText = z.string().trim().default("");

const planSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do plano."),
  monthlyPrice: z.string().trim().min(1, "Informe o valor mensal."),
  classesPerMonth: z.coerce.number().int().min(0, "Quantidade de aulas inválida.").default(0),
  notes: optionalText
});

const subscriptionSchema = z.object({
  studentId: z.string().min(1, "Selecione um aluno."),
  planId: z.string().min(1, "Selecione um plano."),
  dueDay: z.coerce.number().int().min(1).max(31).default(10),
  startedAt: z.string().optional().default(""),
  notes: optionalText
});

const paymentSchema = z.object({
  subscriptionId: z.string().min(1, "Selecione uma assinatura."),
  referenceMonth: z.string().trim().min(7, "Informe o mês de referência."),
  paidAt: z.string().optional().default(""),
  paymentMethod: optionalText,
  amount: z.string().trim().optional().default("")
});

const entrySchema = z.object({
  type: z.enum(["REVENUE", "EXPENSE"]),
  category: z.string().trim().min(2, "Informe a categoria."),
  description: z.string().trim().min(2, "Informe a descrição."),
  amount: z.string().trim().min(1, "Informe o valor."),
  paymentMethod: optionalText,
  status: z.enum(["PENDING", "PAID"]).default("PENDING"),
  dueDate: z.string().optional().default(""),
  paidAt: z.string().optional().default(""),
  notes: optionalText
});

const payrollSchema = z.object({
  teacherId: z.string().min(1, "Selecione um professor."),
  referenceMonth: z.string().trim().min(7, "Informe o mês de referência."),
  fixedSalary: z.string().trim().optional().default("0"),
  classValue: z.string().trim().optional().default("0"),
  bonus: z.string().trim().optional().default("0"),
  discount: z.string().trim().optional().default("0"),
  status: z.enum(["PENDING", "PAID"]).default("PENDING"),
  notes: optionalText
});

function refreshFinanceRoutes() {
  revalidatePath("/financeiro");
  revalidatePath("/professores");
}

function parseMoneyToCents(value: string) {
  const cleanValue = value.trim() || "0";
  const normalized = cleanValue.replace(/\./g, "").replace(",", ".");
  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Valor inválido.");
  }

  return Math.round(amount * 100);
}

function parseDate(value: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getReferenceMonthRange(referenceMonth: string) {
  const [yearValue, monthValue] = referenceMonth.split("-").map(Number);
  const year = Number.isFinite(yearValue) ? yearValue : new Date().getFullYear();
  const monthIndex = Number.isFinite(monthValue) ? monthValue - 1 : new Date().getMonth();

  return {
    start: new Date(year, monthIndex, 1),
    end: new Date(year, monthIndex + 1, 1),
    dueDate: new Date(year, monthIndex + 1, 0)
  };
}

export async function createPlanAction(formData: FormData) {
  const auth = await requireModuleEdit("finance");
  const parsed = planSchema.safeParse({
    name: formData.get("name"),
    monthlyPrice: formData.get("monthlyPrice"),
    classesPerMonth: formData.get("classesPerMonth"),
    notes: formData.get("notes")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  await prisma.plan.create({
    data: {
      arenaId: auth.arenaId,
      name: parsed.data.name,
      monthlyPriceCents: parseMoneyToCents(parsed.data.monthlyPrice),
      classesPerMonth: parsed.data.classesPerMonth,
      notes: parsed.data.notes
    }
  });

  refreshFinanceRoutes();
}

export async function createSubscriptionAction(formData: FormData) {
  const auth = await requireModuleEdit("finance");
  const parsed = subscriptionSchema.safeParse({
    studentId: formData.get("studentId"),
    planId: formData.get("planId"),
    dueDay: formData.get("dueDay"),
    startedAt: formData.get("startedAt"),
    notes: formData.get("notes")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const plan = await prisma.plan.findFirst({
    where: {
      id: parsed.data.planId,
      arenaId: auth.arenaId,
      active: true
    }
  });

  if (!plan) {
    throw new Error("Plano não encontrado.");
  }

  const student = await prisma.student.findFirst({
    where: {
      id: parsed.data.studentId,
      arenaId: auth.arenaId
    }
  });

  if (!student) {
    throw new Error("Aluno não encontrado.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.studentSubscription.updateMany({
      where: {
        arenaId: auth.arenaId,
        studentId: student.id,
        status: "ACTIVE"
      },
      data: {
        status: "CANCELED",
        endedAt: new Date()
      }
    });

    await tx.studentSubscription.create({
      data: {
        arenaId: auth.arenaId,
        studentId: student.id,
        planId: plan.id,
        monthlyPriceCents: plan.monthlyPriceCents,
        classesPerMonth: plan.classesPerMonth,
        dueDay: parsed.data.dueDay,
        startedAt: parseDate(parsed.data.startedAt) ?? new Date(),
        notes: parsed.data.notes
      }
    });
  });

  refreshFinanceRoutes();
}

export async function recordPlanPaymentAction(formData: FormData) {
  const auth = await requireModuleEdit("finance");
  const parsed = paymentSchema.safeParse({
    subscriptionId: formData.get("subscriptionId"),
    referenceMonth: formData.get("referenceMonth"),
    paidAt: formData.get("paidAt"),
    paymentMethod: formData.get("paymentMethod"),
    amount: formData.get("amount")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const subscription = await prisma.studentSubscription.findFirst({
    where: {
      id: parsed.data.subscriptionId,
      arenaId: auth.arenaId
    },
    include: {
      student: true,
      plan: true
    }
  });

  if (!subscription) {
    throw new Error("Assinatura não encontrada.");
  }

  const amountCents = parsed.data.amount ? parseMoneyToCents(parsed.data.amount) : subscription.monthlyPriceCents;
  const paidAt = parseDate(parsed.data.paidAt) ?? new Date();

  await prisma.financialEntry.create({
    data: {
      arenaId: auth.arenaId,
      type: "REVENUE",
      category: "Planos",
      description: `${subscription.student.name} - ${subscription.plan.name} (${parsed.data.referenceMonth})`,
      amountCents,
      paymentMethod: parsed.data.paymentMethod,
      status: "PAID",
      dueDate: paidAt,
      paidAt,
      notes: "Pagamento mensal de aluno."
    }
  });

  refreshFinanceRoutes();
}

export async function createFinancialEntryAction(formData: FormData) {
  const auth = await requireModuleEdit("finance");
  const parsed = entrySchema.safeParse({
    type: formData.get("type"),
    category: formData.get("category"),
    description: formData.get("description"),
    amount: formData.get("amount"),
    paymentMethod: formData.get("paymentMethod"),
    status: formData.get("status"),
    dueDate: formData.get("dueDate"),
    paidAt: formData.get("paidAt"),
    notes: formData.get("notes")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const dueDate = parseDate(parsed.data.dueDate);
  const paidAt = parsed.data.status === "PAID" ? parseDate(parsed.data.paidAt) ?? new Date() : parseDate(parsed.data.paidAt);

  await prisma.financialEntry.create({
    data: {
      arenaId: auth.arenaId,
      type: parsed.data.type,
      category: parsed.data.category,
      description: parsed.data.description,
      amountCents: parseMoneyToCents(parsed.data.amount),
      paymentMethod: parsed.data.paymentMethod,
      status: parsed.data.status,
      dueDate,
      paidAt,
      notes: parsed.data.notes
    }
  });

  refreshFinanceRoutes();
}

export async function upsertPayrollEntryAction(formData: FormData) {
  const auth = await requireModuleEdit("finance");
  const parsed = payrollSchema.safeParse({
    teacherId: formData.get("teacherId"),
    referenceMonth: formData.get("referenceMonth"),
    fixedSalary: formData.get("fixedSalary"),
    classValue: formData.get("classValue"),
    bonus: formData.get("bonus"),
    discount: formData.get("discount"),
    status: formData.get("status"),
    notes: formData.get("notes")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const { start, end, dueDate } = getReferenceMonthRange(parsed.data.referenceMonth);
  const teacher = await prisma.teacher.findFirst({
    where: {
      id: parsed.data.teacherId,
      arenaId: auth.arenaId
    },
    include: {
      lessons: {
        where: {
          scheduledAt: {
            gte: start,
            lt: end
          },
          status: "COMPLETED"
        }
      }
    }
  });

  if (!teacher) {
    throw new Error("Professor não encontrado.");
  }

  const fixedSalaryCents = parseMoneyToCents(parsed.data.fixedSalary);
  const classValueCents = parseMoneyToCents(parsed.data.classValue);
  const bonusCents = parseMoneyToCents(parsed.data.bonus);
  const discountCents = parseMoneyToCents(parsed.data.discount);
  const totalCents = Math.max(
    0,
    fixedSalaryCents + teacher.lessons.length * classValueCents + bonusCents - discountCents
  );
  const description = `Folha ${teacher.name} - ${parsed.data.referenceMonth}`;

  await prisma.$transaction(async (tx) => {
    await tx.teacherPayrollEntry.upsert({
      where: {
        teacherId_referenceMonth: {
          teacherId: teacher.id,
          referenceMonth: parsed.data.referenceMonth
        }
      },
      update: {
        fixedSalaryCents,
        classValueCents,
        bonusCents,
        discountCents,
        paidCents: parsed.data.status === "PAID" ? totalCents : 0,
        status: parsed.data.status,
        notes: parsed.data.notes
      },
      create: {
        arenaId: auth.arenaId,
        teacherId: teacher.id,
        referenceMonth: parsed.data.referenceMonth,
        fixedSalaryCents,
        classValueCents,
        bonusCents,
        discountCents,
        paidCents: parsed.data.status === "PAID" ? totalCents : 0,
        status: parsed.data.status,
        notes: parsed.data.notes
      }
    });

    const existingEntry = await tx.financialEntry.findFirst({
      where: {
        arenaId: auth.arenaId,
        type: "EXPENSE",
        category: "Folha de pagamento",
        description
      }
    });

    const entryData = {
      amountCents: totalCents,
      paymentMethod: "",
      status: parsed.data.status,
      dueDate,
      paidAt: parsed.data.status === "PAID" ? new Date() : null,
      notes: `Gerado pela folha. Aulas concluídas no mês: ${teacher.lessons.length}.`
    };

    if (existingEntry) {
      await tx.financialEntry.update({
        where: {
          id: existingEntry.id
        },
        data: entryData
      });
    } else {
      await tx.financialEntry.create({
        data: {
          arenaId: auth.arenaId,
          type: "EXPENSE",
          category: "Folha de pagamento",
          description,
          ...entryData
        }
      });
    }
  });

  refreshFinanceRoutes();
}
