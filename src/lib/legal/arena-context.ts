import "server-only";
import {notFound,redirect} from "next/navigation";
import {getLegalArenaContext} from "@/lib/portal/support-query";
export async function getPublicLegalArena(slug:string,path:string){const context=await getLegalArenaContext(slug);if(context.arena)return context.arena;if(context.canonicalSlug)redirect(`/classificacao/${encodeURIComponent(context.canonicalSlug)}/${path}`);notFound();}
