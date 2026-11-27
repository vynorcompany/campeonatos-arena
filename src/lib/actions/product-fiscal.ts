"use server";
import { runProductMutation } from "@/lib/products/mutation";
export async function updateProductFiscalProfileAction(formData: FormData) { return runProductMutation("product-fiscal", formData); }
