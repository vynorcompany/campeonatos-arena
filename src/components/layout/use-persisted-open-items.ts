"use client";

import { useEffect, useRef, useState } from "react";

export function usePersistedOpenItems(storageKey: string, initialItems: string[]) {
  const initialItemsRef = useRef(initialItems);
  const [openItems, setOpenItems] = useState<Set<string>>(() => new Set(initialItems));
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
          setOpenItems(new Set([...parsed, ...initialItemsRef.current]));
        }
      }
    } catch {
      // Storage may be unavailable; keep the server-rendered active items.
    } finally {
      setRestored(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!restored) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify([...openItems]));
    } catch {
      // Navigation still works when storage is unavailable.
    }
  }, [openItems, restored, storageKey]);

  return [openItems, setOpenItems] as const;
}
