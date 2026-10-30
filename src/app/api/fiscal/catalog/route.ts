import { requireModuleView } from "@/lib/auth/guards";
import {
  searchNcm,
  findNcm,
  ncmCatalogVersion,
} from "@/lib/fiscal/ncm-catalog";
import {
  searchRtc,
  rtcCatalogVersion,
} from "@/lib/fiscal/product-profile-service";
export async function GET(request: Request) {
  await requireModuleView("stock");
  const url = new URL(request.url),
    q = (url.searchParams.get("q") ?? "").trim().slice(0, 100),
    kind = url.searchParams.get("kind");
  const rows = kind === "rtc" ? searchRtc(q) : searchNcm(q);
  const exact = kind !== "rtc" && q.length === 8 ? findNcm(q) : null;
  return Response.json(
    {
      rows,
      exact: exact ? { code: exact.code, label: exact.label } : null,
      version: kind === "rtc" ? rtcCatalogVersion : ncmCatalogVersion,
    },
    { headers: { "Cache-Control": "private, max-age=3600" } },
  );
}
