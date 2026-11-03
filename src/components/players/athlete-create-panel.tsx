"use client";
import { viewStyles } from "./athlete-create-panel.utilities";

import { Modal } from "@/components/ui/modal";
import { useCallback, useState } from "react";
import { PlayerForm } from "@/components/forms/player-form";

export function AthleteCreatePanel({ openLabel = "Adicionar novo atleta", guardians = [] }: { openLabel?: string; guardians?: { id:string; name:string }[] }) {
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => setIsOpen(false), []);
  return (
    <div className={viewStyles.athlete_create_panel}>
      <button
        type="button"
        className={viewStyles.button_button_primary}
        aria-expanded={isOpen}

        onClick={() => setIsOpen((current) => !current)}
      >
        {isOpen ? "Fechar cadastro" : openLabel}
      </button>

      <Modal title="Novo cliente" open={isOpen} onClose={close} width="tw:max-w-[800px]">{isOpen ? <PlayerForm guardians={guardians} /> : null}</Modal>
    </div>
  );
}
