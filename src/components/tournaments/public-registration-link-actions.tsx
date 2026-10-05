"use client";
import { viewStyles } from "./public-registration-link-actions.utilities";

import { useState } from "react";
import Link from "next/link";
import { EventIcon } from "@/components/tournaments/event-icon";

export function PublicRegistrationLinkActions({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/inscricao/${slug}`;

  async function handleCopy() {
    const url = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={viewStyles.section_actions}>
      <Link href={path} target="_blank" rel="noreferrer" className={viewStyles.button}>
        <EventIcon name="user-plus" />Abrir inscrição pública
      </Link>
      <button type="button" className={viewStyles.button} onClick={handleCopy}>
        <EventIcon name="link" />{copied ? "Link copiado" : "Copiar link"}
      </button>
    </div>
  );
}

