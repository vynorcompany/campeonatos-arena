"use client";

import { useEffect, useState } from "react";

export function PlayerAvatar({ photoUrl, name, className }: { photoUrl: string; name: string; className: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [photoUrl]);
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";

  return <span className={className}>{photoUrl && !failed ? <img src={photoUrl} alt="" onError={() => setFailed(true)} /> : initials}</span>;
}
