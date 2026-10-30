"use server";
import { ZodError } from "zod";
import { ProductFiscalValidationError } from "@/lib/fiscal/product-profile";
import { revalidatePath } from "next/cache";
import { requireModuleEdit } from "@/lib/auth/guards";
import { arenaDatabase } from "@/lib/arena-database";
import { saveProductFiscalProfile } from "@/lib/fiscal/product-profile-service";
export async function updateProductFiscalProfileAction(formData: FormData) {
  const auth = await requireModuleEdit("stock");
  const productId = String(formData.get("productId") ?? "");
  let value: unknown;
  try {
    value = JSON.parse(String(formData.get("fiscalProfile") ?? ""));
  } catch {
    return { error: "Revise os dados fiscais do produto." };
  }
  try {
    await arenaDatabase(auth.arenaId).$transaction((tx) =>
      saveProductFiscalProfile(
        tx,
        auth.arenaId,
        auth.userId,
        productId,
        value,
        auth.userName,
      ),
    );
  } catch (error) {
    if (error instanceof ProductFiscalValidationError)
      return { error: error.message };
    if (error instanceof ZodError)
      return { error: error.issues[0]?.message ?? "Revise os dados fiscais." };
    console.error("Falha ao salvar perfil fiscal de produto", {
      name: error instanceof Error ? error.name : "unknown",
    });
    return {
      error: "Não foi possível salvar a configuração fiscal. Tente novamente.",
    };
  }
  revalidatePath(`/pdv/${productId}`);
  revalidatePath("/pdv/estoque");
}
