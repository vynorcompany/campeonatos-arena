"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { submenuTabs } from "./submenu-tabs";
export function AnchorSubmenu({ label, items }: { label: string; items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  useEffect(() => { const update = () => setActive(location.hash.slice(1) || items[0]?.id || ""); update(); window.addEventListener("hashchange", update); return () => window.removeEventListener("hashchange", update); }, [items]);
  return <nav className={submenuTabs.bar} aria-label={label}>{items.map(item => <Link key={item.id} href={`#${item.id}`} onClick={() => setActive(item.id)} aria-current={active === item.id ? "location" : undefined} className={submenuTabs.item}>{item.label}</Link>)}</nav>;
}
