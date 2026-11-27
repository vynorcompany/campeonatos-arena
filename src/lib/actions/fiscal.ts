"use server";
import { runNfeOperation } from '@/lib/products/nfe-mutation';
import { nfePreviewOutcomeSchema, nfeImportOutcomeSchema } from '@/lib/backend/contracts/nfe-import';
export async function previewNfeXmlAction(form: FormData) { return nfePreviewOutcomeSchema.parse(await runNfeOperation('preview', form)); }
export async function importNfeXmlAction(form: FormData) { return nfeImportOutcomeSchema.parse(await runNfeOperation('import', form)); }
