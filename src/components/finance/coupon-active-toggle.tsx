"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleCouponActiveAction } from "@/lib/actions/finance";

export function CouponActiveToggle({ couponId, active }: { couponId: string; active: boolean }) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(active);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function toggle() {
    const nextActive = !isActive;
    setError("");
    startTransition(async () => {
      try {
        const data = new FormData();
        data.set("couponId", couponId);
        if (nextActive) data.set("active", "on");
        await toggleCouponActiveAction(data);
        setIsActive(nextActive);
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Não foi possível atualizar o cupom.");
      }
    });
  }

  return <div className="settings-coupon-status"><button type="button" className="control-toggle" role="switch" aria-checked={isActive} disabled={pending} onClick={toggle}><span aria-hidden="true" /><em>{isActive ? "Ativo" : "Inativo"}</em></button>{error ? <small className="form-error">{error}</small> : null}</div>;
}
