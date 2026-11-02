import { NextResponse } from "next/server";
import { releaseRevision } from "@/lib/release-version";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ revision: releaseRevision(process.env.RAILWAY_GIT_COMMIT_SHA) }, {
    headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" },
  });
}
