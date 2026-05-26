"use client";

import { useState } from "react";
import Link from "next/link";

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
    <div className="section-actions">
      <Link href={path} target="_blank" rel="noreferrer" className="button">
        Abrir inscrição pública
      </Link>
      <button type="button" className="button" onClick={handleCopy}>
        {copied ? "Link copiado" : "Copiar link"}
      </button>
    </div>
  );
}

