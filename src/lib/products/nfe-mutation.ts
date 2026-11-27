import 'server-only';
import { revalidatePath } from 'next/cache';
import { remoteNfeOperation } from '@/lib/backend/nfe-import-client';
import { ProductOperationError } from '@/lib/backend/product-operation-error';
import { NfeXmlValidationError } from '@/lib/fiscal/nfe-error';
import type { NfeOperation } from '@/lib/backend/contracts/nfe-import';
export async function runNfeOperation(operation: NfeOperation, form: FormData) {
  const origin = process.env.VX4_BACKEND_ORIGIN;
  let result;
  try { result = origin ? await remoteNfeOperation(origin, operation, form) : await (await import('@/lib/backend/services/nfe-mutations')).executeNfeOperation(operation, form); }
  catch (error) { return { error: error instanceof ProductOperationError || error instanceof NfeXmlValidationError ? error.message : 'Não foi possível confirmar a importação. Confira o estoque antes de tentar novamente.' }; }
  if (operation === 'import' && !('error' in result)) for (const path of ['/financeiro/configuracoes/notas-fiscais','/financeiro/notas-fiscais','/pdv','/pdv/estoque']) revalidatePath(path);
  return result;
}
