import { NextRequest } from "next/server";
import { handleComandaMutation } from "@/lib/backend/comanda-route";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest, context: { params: Promise<{ operation: string }> }) {
  return handleComandaMutation(request, (await context.params).operation, true);
}
