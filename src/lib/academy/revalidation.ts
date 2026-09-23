import { revalidatePath } from "next/cache";

export function refreshAcademyRoutes() {
  revalidatePath("/aulas");
  revalidatePath("/aulas/alunos");
  revalidatePath("/professores");
  revalidatePath("/financeiro");
}

