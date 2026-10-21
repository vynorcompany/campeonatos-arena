"use client";
import { useEffect, useRef, useState } from "react";
import type { WhatsAppMessage } from "./types";
const emptyMessages: WhatsAppMessage[] = [];
export function conversationHistoryRetryDelay(attempt: number) {
  return Math.min(30_000, 2_000 * 2 ** Math.min(Math.max(attempt, 0), 4));
}
/** Retain only the open conversation; unchanged histories transfer no message body. */
export function useConversationMessages(conversationId: string | undefined, accountJid: string, version: string) {
  const [history, setHistory] = useState<{ key: string; version: string; messages: WhatsAppMessage[] } | null>(null);
  const [failedKey, setFailedKey] = useState("");
  const [attempt, setAttempt] = useState(0);
  const validator = useRef({ key: "", etag: "" });
  const generation = useRef(0);
  const key = accountJid + ":" + (conversationId || "");
  useEffect(() => {
    if (!conversationId || !accountJid) return;
    const requestGeneration = generation.current;
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    setFailedKey("");
    void fetch("/api/whatsapp/conversations/" + encodeURIComponent(conversationId) + "/messages", { cache: "no-store", signal: controller.signal, headers: validator.current.key === key && validator.current.etag ? { "If-None-Match": validator.current.etag } : {} })
      .then(async response => {
        if (response.status === 304) {
          if (!controller.signal.aborted && requestGeneration === generation.current) setHistory((current) => current?.key === key ? { ...current, version } : current);
          return;
        }
        if (!response.ok) throw new Error("History unavailable");
        const payload = await response.json();
        if (!Array.isArray(payload.messages)) throw new Error("Invalid history");
        if (!controller.signal.aborted && requestGeneration === generation.current) {
          validator.current = { key, etag: response.headers.get("etag") || "" };
          setHistory({ key, version, messages: payload.messages });
        }
    }).catch(() => { if (active && requestGeneration === generation.current) setFailedKey(key); })
      .finally(() => window.clearTimeout(timeout));
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [conversationId, accountJid, version, key, attempt]);
  useEffect(() => {
    if (failedKey !== key || !conversationId || !accountJid) return;
    let timer: number | undefined;
    const visible = () => document.visibilityState === "visible" && navigator.onLine !== false;
    const scheduleRetry = () => {
      if (timer !== undefined || !visible()) return;
      timer = window.setTimeout(() => {
        timer = undefined;
        if (visible()) setAttempt(value => value + 1);
      }, conversationHistoryRetryDelay(attempt));
    };
    scheduleRetry();
    document.addEventListener("visibilitychange", scheduleRetry);
    window.addEventListener("focus", scheduleRetry);
    window.addEventListener("online", scheduleRetry);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", scheduleRetry);
      window.removeEventListener("focus", scheduleRetry);
      window.removeEventListener("online", scheduleRetry);
    };
  }, [failedKey, key, conversationId, accountJid, attempt]);
  const ready = history?.key === key && history.version === version;
  const clearAndRetry = () => {
    generation.current += 1;
    validator.current = { key: "", etag: "" };
    setHistory({ key, version, messages: [] });
    setFailedKey("");
    setAttempt(value => value + 1);
  };
  return { messages: history?.key === key ? history.messages : emptyMessages, ready, failed: failedKey === key, loading: Boolean(conversationId && accountJid && !ready && failedKey !== key), retry: () => setAttempt(value => value + 1), clearAndRetry };
}
