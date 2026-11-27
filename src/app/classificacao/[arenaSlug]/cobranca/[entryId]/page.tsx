import {notFound,redirect} from "next/navigation";
import {getOwnChargeLink} from "@/lib/portal/support-query";
export default async function OpenPublicChargePage(props:{params:Promise<{arenaSlug:string;entryId:string}>}){const params=await props.params,result=await getOwnChargeLink(params.arenaSlug,params.entryId);if(result.status==="LOGIN")redirect(`/classificacao/${encodeURIComponent(params.arenaSlug)}?section=finance`);if(result.status!=="READY")notFound();redirect(result.url);}
