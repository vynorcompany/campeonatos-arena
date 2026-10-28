"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { PortalRichText } from "@/components/portal-rich-text";
type Post = { id: string; title: string; message: string; pinned: boolean; linkUrl: string | null; createdAt: string };
export function AnnouncementsFeed({ arenaSlug }: { arenaSlug: string }) {
  const [items, setItems] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    if (busy.current || cursor === null) return;
    busy.current = true; setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ arena: arenaSlug });
      if (cursor) params.set("cursor", cursor);
      const response = await fetch(`/api/public/announcements?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Não foi possível carregar os avisos.");
      const page = await response.json() as { items: Post[]; nextCursor: string | null };
      setItems(previous => { const ids = new Set(previous.map(post => post.id)); return [...previous, ...page.items.filter(post => !ids.has(post.id))]; });
      setCursor(page.nextCursor);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Tente novamente."); }
    finally { busy.current = false; setLoading(false); }
  }, [arenaSlug, cursor]);
  useEffect(() => {
    const target = sentinel.current;
    if (!target || error) return;
    if (typeof IntersectionObserver === "undefined") { if (cursor === undefined) void load(); return; }
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) void load(); }, { rootMargin: "300px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [load, error, cursor]);
  return <section aria-label="Avisos" className="tw:mx-auto tw:w-full tw:max-w-3xl tw:px-2 tw:text-[var(--portal-text)]">
    {items.map(post => <article key={post.id} className="tw:border-b tw:border-blue-300/35 tw:py-7">
      <div className="tw:mb-2 tw:flex tw:items-center tw:gap-3 tw:text-xs tw:text-[var(--portal-muted)]"><time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleDateString("pt-BR")}</time>{post.pinned ? <span className="tw:font-semibold tw:text-blue-600 tw:dark:text-blue-300">Fixado</span> : null}</div>
      <h2 className="tw:mb-3 tw:text-lg tw:font-semibold">{post.title}</h2>
      <div className="tw:break-words tw:text-sm tw:leading-7"><PortalRichText text={post.message} /></div>
      {post.linkUrl && /^https?:\/\//i.test(post.linkUrl) ? <a href={post.linkUrl} target="_blank" rel="noreferrer" className="tw:mt-3 tw:inline-flex tw:font-semibold tw:text-blue-600 tw:dark:text-blue-300">Abrir link ↗</a> : null}
    </article>)}
    <div ref={sentinel} className="tw:py-6 tw:text-center" aria-live="polite">{loading ? "Carregando avisos…" : error || (cursor === null && !items.length ? "A arena ainda não divulgou avisos." : "")}</div>
    {!loading && (error || cursor !== null) ? <button type="button" onClick={() => void load()} className="tw:mx-auto tw:mb-6 tw:block tw:rounded-md tw:border tw:border-blue-300 tw:px-4 tw:py-2">{error ? "Tentar novamente" : "Carregar mais"}</button> : null}
  </section>;
}
