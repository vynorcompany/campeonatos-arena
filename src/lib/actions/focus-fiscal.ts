"use server";
import { runFiscalConsult } from '@/lib/fiscal/consult-mutation';
export async function consultFocusDocumentAction(form: FormData) { return runFiscalConsult(form); }
