import 'server-only';
import { revalidatePath } from 'next/cache';
import { remoteProductMutation } from '@/lib/backend/product-mutations-client';
import type { ProductMutationOperation } from '@/lib/backend/contracts/product-mutations';
export async function runProductMutation(operation: ProductMutationOperation, form: FormData) {
  const origin = process.env.VX4_BACKEND_ORIGIN;
  const result = origin ? await remoteProductMutation(origin, operation, form).catch(() => ({ error: 'Não foi possível confirmar a alteração. Confira os dados antes de tentar novamente.' })) : await (await import('@/lib/backend/services/product-mutations')).executeProductMutation(operation, form);
  if ('error' in result) return result;
  for (const path of operation === 'standard-service-price' ? ['/pdv', '/pdv/servicos', '/agenda', '/comandas'] : ['/pdv/servicos', '/agenda', '/comandas', '/home']) revalidatePath(path);
}
