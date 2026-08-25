"use client";

import { useState } from "react";
import { PlayerForm } from "@/components/forms/player-form";

export function AthleteCreatePanel({ openLabel = "Adicionar novo atleta" }: { openLabel?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="athlete-create-panel">
      <button
        type="button"
        className="button button-primary"
        aria-expanded={isOpen}
        aria-controls="athlete-create-form"
        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? "Fechar cadastro" : openLabel}
      </button>

      <div id="athlete-create-form" hidden={!isOpen}>
        {isOpen ? <PlayerForm /> : null}
      </div>
    </div>
  );
}
