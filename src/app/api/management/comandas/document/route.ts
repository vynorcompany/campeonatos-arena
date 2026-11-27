import {NextRequest} from "next/server";
import {handleComandaQuery} from "@/lib/backend/comanda-query-route";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){return handleComandaQuery(request,true);}
