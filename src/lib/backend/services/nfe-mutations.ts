import 'server-only';
import { importNfeXmlAction, previewNfeXmlAction } from '@/lib/backend/services/nfe-import';
import { nfeImportDataSchema, nfePreviewDataSchema, type NfeOperation } from '@/lib/backend/contracts/nfe-import';
export async function executeNfeOperation(operation: NfeOperation, form: FormData) {
  return operation === 'preview' ? nfePreviewDataSchema.parse(await previewNfeXmlAction(form)) : nfeImportDataSchema.parse(await importNfeXmlAction(form));
}
