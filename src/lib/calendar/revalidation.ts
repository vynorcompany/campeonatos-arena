import { revalidatePath } from "next/cache";

export function refreshCalendarRoutes() {
  revalidatePath("/calendario");
  revalidatePath("/agenda");
  revalidatePath("/agenda/configuracao");
  revalidatePath("/comandas");
  revalidatePath("/financeiro/contas-a-receber");
  revalidatePath("/financeiro/lancamentos");
}
