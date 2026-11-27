"use server";
import { runProductMutation } from '@/lib/products/mutation';
export async function updateStandardServicePriceAction(form: FormData) { return runProductMutation('standard-service-price', form); }
