"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AthletePortalPrefetch({ hrefs }: { hrefs: string[] }) {
  const router = useRouter();
  useEffect(() => { hrefs.forEach((href) => router.prefetch(href)); }, [hrefs, router]);
  return null;
}
