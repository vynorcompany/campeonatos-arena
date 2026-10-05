import { cx } from "@/lib/ui/classes";
import { viewStyles } from "./section-card.utilities";
type SectionCardProps = {
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function SectionCard({ id, title, description, children, className }: SectionCardProps) {
  return (
    <section id={id} className={cx([viewStyles.card, viewStyles.stack_md, className].filter(Boolean).join(" "))}>
      <div className={viewStyles.stack_xs}>
        <h2>{title}</h2>
        {description ? <p className={viewStyles.muted}>{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
