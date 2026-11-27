"use server";
import { runProductMutation } from "@/lib/products/mutation";
export async function createProductAction(formData: FormData) { return runProductMutation("create-product", formData); }
export async function updateProductAction(formData: FormData) { return runProductMutation("update-product", formData); }
export async function adjustStockAction(formData: FormData) { return runProductMutation("adjust-stock", formData); }
export async function createStockBalanceAction(formData: FormData) { return runProductMutation("stock-balance", formData); }
export async function createSaleAction(formData: FormData) { return runProductMutation("create-sale", formData); }
export async function createCartSaleAction(formData: FormData) { return runProductMutation("create-cart-sale", formData); }
export async function updateStockAggregatesAction(formData: FormData) { return runProductMutation("stock-aggregates", formData); }
