"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createPublicRegistrationSchema } from "@/lib/validators/public-registration";

type PublicRegistrationState = {
  error: string | null;
  success: string | null;
  paymentReference?: string;
  amountCents?: number;
  paymentQrCode?: string;
  paymentQrCodeBase64?: string;
  paymentCheckoutUrl?: string;
  paymentMethod?: "PIX" | "CARD";
};

const initialState: PublicRegistrationState = {
  error: null,
  success: null
};

function normalizeCpf(input: string) {
  return input.replace(/\D/g, "");
}

function normalizeDateInput(input: unknown) {
  const value = String(input ?? "").trim();
  const brMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    return `${year}-${month}-${day}`;
  }
  return value;
}

function getPriceByOrder(
  order: number,
  pricing: { priceFirstCents: number; priceSecondCents: number; priceThirdCents: number }
) {
  if (order <= 1) return pricing.priceFirstCents;
  if (order === 2) return pricing.priceSecondCents;
  return pricing.priceThirdCents;
}

export async function createPublicRegistrationAction(
  _: PublicRegistrationState,
  formData: FormData
): Promise<PublicRegistrationState> {
  const parsed = createPublicRegistrationSchema.safeParse({
    tournamentSlug: formData.get("tournamentSlug"),
    categoryId: formData.get("categoryId"),
    paymentMethod: formData.get("paymentMethod"),
    leadName: formData.get("leadName"),
    leadEmail: formData.get("leadEmail"),
    leadPhone: formData.get("leadPhone"),
    leadCpf: normalizeCpf(String(formData.get("leadCpf") ?? "")),
    leadBirthDate: normalizeDateInput(formData.get("leadBirthDate")),
    partnerName: formData.get("partnerName"),
    partnerPhone: formData.get("partnerPhone"),
    partnerCpf: normalizeCpf(String(formData.get("partnerCpf") ?? "")),
    partnerBirthDate: normalizeDateInput(formData.get("partnerBirthDate"))
  });

  if (!parsed.success) {
    return { ...initialState, error: parsed.error.issues[0]?.message ?? "Dados invalidos." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const tournament = await tx.tournament.findUnique({
        where: { publicSlug: parsed.data.tournamentSlug },
        include: {
          categories: {
            where: { active: true },
            orderBy: { level: "asc" }
          }
        }
      });

      if (!tournament) throw new Error("Torneio nao encontrado.");
      if (tournament.registrationPhase !== "REGISTRATIONS") {
        throw new Error("As inscricoes deste torneio estao encerradas.");
      }

      const selectedCategory = tournament.categories.find((category) => category.id === parsed.data.categoryId);
      if (!selectedCategory) throw new Error("Categoria invalida.");

      const cpfs = [parsed.data.leadCpf, parsed.data.partnerCpf];
      const registrations = await tx.publicTournamentRegistration.findMany({
        where: {
          tournamentId: tournament.id,
          OR: [{ leadCpf: { in: cpfs } }, { partnerCpf: { in: cpfs } }],
          status: {
            not: "CANCELED"
          }
        },
        include: {
          category: {
            select: { level: true }
          }
        }
      });

      const registrationOrder = registrations.length + 1;

      if (tournament.blockCategoryGap) {
        for (const existing of registrations) {
          if (Math.abs(existing.category.level - selectedCategory.level) > tournament.maxCategoryGap) {
            throw new Error("A categoria escolhida viola o bloqueio de diferenca de nivel permitido.");
          }
        }
      }

      const leadCount = registrations.filter(
        (item) => item.leadCpf === parsed.data.leadCpf || item.partnerCpf === parsed.data.leadCpf
      ).length;
      const partnerCount = registrations.filter(
        (item) => item.leadCpf === parsed.data.partnerCpf || item.partnerCpf === parsed.data.partnerCpf
      ).length;

      const categoryPricing = {
        priceFirstCents: tournament.priceFirstCents,
        priceSecondCents: selectedCategory.priceSecondCents,
        priceThirdCents: selectedCategory.priceThirdCents
      };

      const leadAmountCents = getPriceByOrder(leadCount + 1, categoryPricing);
      const partnerAmountCents = getPriceByOrder(partnerCount + 1, categoryPricing);
      const amountCents = leadAmountCents + partnerAmountCents;
      const registration = await tx.publicTournamentRegistration.create({
        data: {
          tournamentId: tournament.id,
          categoryId: selectedCategory.id,
          leadName: parsed.data.leadName,
          leadPhone: parsed.data.leadPhone,
          leadCpf: parsed.data.leadCpf,
          leadBirthDate: parsed.data.leadBirthDate,
          partnerName: parsed.data.partnerName,
          partnerPhone: parsed.data.partnerPhone,
          partnerCpf: parsed.data.partnerCpf,
          partnerBirthDate: parsed.data.partnerBirthDate,
          registrationOrder,
          amountCents,
          paymentStatus: "PAID",
          paymentProvider: "TEST_NO_PAYMENT",
          paymentReference: "TEST_NO_PAYMENT",
          status: "CONFIRMED"
        }
      });

      return { registration, amountCents, tournamentName: tournament.name };
    });

    revalidatePath(`/inscricao/${parsed.data.tournamentSlug}`);
    return {
      error: null,
      success: "Inscricao criada e confirmada com sucesso (modo teste sem pagamento).",
      paymentReference: "TEST_NO_PAYMENT",
      amountCents: result.amountCents,
      paymentQrCode: "",
      paymentQrCodeBase64: "",
      paymentCheckoutUrl: "",
      paymentMethod: parsed.data.paymentMethod
    };
  } catch (error) {
    return {
      ...initialState,
      error: error instanceof Error ? error.message : "Nao foi possivel concluir a inscricao."
    };
  }
}
