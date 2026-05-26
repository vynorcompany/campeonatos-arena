import Link from "next/link";

type EmptyStateProps = {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export function EmptyState({ title, description, ctaLabel, ctaHref }: EmptyStateProps) {
  return (
    <div className="t-empty-state">
      <strong>{title}</strong>
      <p>{description}</p>
      {ctaLabel && ctaHref ? (
        <Link href={ctaHref} className="button button-primary">
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}

