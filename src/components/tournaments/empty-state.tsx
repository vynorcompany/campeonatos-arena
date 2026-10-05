import { viewStyles } from "./empty-state.utilities";
import Link from "next/link";

type EmptyStateProps = {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function EmptyState({ title, description, ctaLabel, ctaHref }: EmptyStateProps) {
  return (
    <div className={viewStyles.t_empty_state}>
      <strong>{title}</strong>
      <p>{description}</p>
      {ctaLabel && ctaHref ? (
        <Link href={ctaHref} className={viewStyles.button_button_primary}>
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}

