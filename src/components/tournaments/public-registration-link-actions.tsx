"use client";
import { actionIconButton } from "@/components/ui/action-icon";
import { viewStyles } from "./public-registration-link-actions.utilities";

import { useState } from "react";
import Link from "next/link";
import { EventIcon } from "@/components/tournaments/event-icon";

export function PublicRegistrationLinkActions({ slug, compact = false }: { slug: string; compact?: boolean }) {
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
      <Link href={path} target="_blank" rel="noreferrer" className={compact ? actionIconButton : viewStyles.button} title="Abrir inscrição pública" aria-label="Abrir inscrição pública">
        <EventIcon name="user-plus" />{!compact ? "Abrir inscrição pública" : null}
      </Link>
      <button type="button" className={compact ? actionIconButton : viewStyles.button} title={copied ? "Link copiado" : "Copiar link"} aria-label={copied ? "Link copiado" : "Copiar link"} onClick={handleCopy}>
        <EventIcon name="link" />{!compact ? (copied ? "Link copiado" : "Copiar link") : <span className="tw:sr-only" role="status">{copied ? "Link copiado" : ""}</span>}
      </button>
    </div>
  );
}

