"use client";
import { useEffect, useRef, useState } from "react";
import type { WhatsAppMessage } from "./types";
const emptyMessages: WhatsAppMessage[] = [];
/** Retain only the open conversation; unchanged histories transfer no message body. */
export function useConversationMessages(conversationId: string | undefined, accountJid: string, version: string) {
  const [history, setHistory] = useState<{ key: string; messages: WhatsAppMessage[] } | null>(null);
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
        if (response.status === 304) return;
        if (!response.ok) throw new Error("History unavailable");
        const payload = await response.json();
        if (!Array.isArray(payload.messages)) throw new Error("Invalid history");
        if (!controller.signal.aborted) {
          validator.current = { key, etag: response.headers.get("etag") || "" };
          setHistory({ key, messages: payload.messages });
        }
      }).catch(() => { if (!controller.signal.aborted) setFailedKey(key); });
    return () => controller.abort();
  }, [conversationId, accountJid, version, key, attempt]);
  return { messages: history?.key === key ? history.messages : emptyMessages, failed: failedKey === key, loading: Boolean(conversationId && accountJid && history?.key !== key && failedKey !== key), retry: () => setAttempt(value => value + 1) };
}
