import Link from "next/link";
import styles from "./operational-submenu-list.module.css";

type OperationalSubmenuItem = { label: string; description: string; href: string };

export function OperationalSubmenuList({ ariaLabel, items }: { ariaLabel: string; items: readonly OperationalSubmenuItem[] }) {
  return <nav className={styles.list} aria-label={ariaLabel}>{items.map((item) => <Link href={item.href} key={item.href}><span className={styles.icon} aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 19V9m7 10V5m7 14v-7" /></svg></span><span className={styles.copy}><strong>{item.label}</strong><small>{item.description}</small></span><svg className={styles.arrow} viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></Link>)}</nav>;
}
