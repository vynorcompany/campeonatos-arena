"use server";
import { runProductMutation } from '@/lib/products/mutation';
export async function saveServiceAction(form: FormData) { return runProductMutation('save-service', form); }
export async function manageServiceAction(form: FormData) { return runProductMutation('manage-service', form); }
