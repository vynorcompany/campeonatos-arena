"use client";
import { useEffect, useRef, useState } from "react";
import type { WhatsAppMessage } from "./types";
const emptyMessages: WhatsAppMessage[] = [];
/** Retain only the open conversation; unchanged histories transfer no message body. */
export function useConversationMessages(conversationId: string | undefined, accountJid: string, version: string) {
  const [history, setHistory] = useState<{ key: string; version: string; messages: WhatsAppMessage[] } | null>(null);
  const [failedKey, setFailedKey] = useState("");
  const [attempt, setAttempt] = useState(0);
  const validator = useRef({ key: "", etag: "" });
  const key = accountJid + ":" + (conversationId || "");
  useEffect(() => {
    if (!conversationId || !accountJid) return;
    const controller = new AbortController();
    setFailedKey("");
    void fetch("/api/whatsapp/conversations/" + encodeURIComponent(conversationId) + "/messages", { cache: "no-store", signal: controller.signal, headers: validator.current.key === key && validator.current.etag ? { "If-None-Match": validator.current.etag } : {} })
      .then(async response => {
        if (response.status === 304) {
          if (!controller.signal.aborted) setHistory((current) => current?.key === key ? { ...current, version } : current);
          return;
        }
        if (!response.ok) throw new Error("History unavailable");
        const payload = await response.json();
        if (!Array.isArray(payload.messages)) throw new Error("Invalid history");
        if (!controller.signal.aborted) {
          validator.current = { key, etag: response.headers.get("etag") || "" };
          setHistory({ key, version, messages: payload.messages });
        }
      }).catch(() => { if (!controller.signal.aborted) setFailedKey(key); });
    return () => controller.abort();
  }, [conversationId, accountJid, version, key, attempt]);
  const ready = history?.key === key && history.version === version;
  return { messages: history?.key === key ? history.messages : emptyMessages, ready, failed: failedKey === key, loading: Boolean(conversationId && accountJid && !ready && failedKey !== key), retry: () => setAttempt(value => value + 1) };
}
