"use client";
import { useCallback, useLayoutEffect, useRef } from "react";

/** Follow the latest message while retaining deliberate reading of older messages. */
export function useThreadScroll(conversationKey: string, revision: string) {
  const thread = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);
  const previousKey = useRef("");
  const bottom = useCallback(() => {
    const element = thread.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, []);
  const follow = useCallback(() => { pinned.current = true; requestAnimationFrame(bottom); }, [bottom]);
  const onScroll = useCallback(() => {
    const element = thread.current;
    if (element) pinned.current = element.scrollHeight - element.scrollTop - element.clientHeight < 64;
  }, []);
  useLayoutEffect(() => {
    if (previousKey.current !== conversationKey) { previousKey.current = conversationKey; pinned.current = true; }
    if (pinned.current) bottom();
  }, [conversationKey, revision, bottom]);
  useLayoutEffect(() => {
    const element = content.current;
    const container = thread.current;
    if (!element || !container) return;
    const observer = new ResizeObserver(() => { if (pinned.current) bottom(); });
    observer.observe(element); observer.observe(container);
    return () => observer.disconnect();
  }, [conversationKey, bottom]);
  return { thread, content, onScroll, follow };
}
