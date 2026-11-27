"use server";
import { runCashMutation } from '@/lib/products/cash-mutation';
export async function openCashRegisterAction(form: FormData) { return runCashMutation('open', form); }
export async function createCashMovementAction(form: FormData) { return runCashMutation('movement', form); }
export async function closeCashRegisterAction(form: FormData) { return runCashMutation('close', form); }
