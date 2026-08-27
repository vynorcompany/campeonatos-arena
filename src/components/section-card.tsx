type SectionCardProps = {
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function SectionCard({ id, title, description, children, className }: SectionCardProps) {
  return (
    <section id={id} className={["card", "stack-md", className].filter(Boolean).join(" ")}>
      <div className="stack-xs">
        <h2>{title}</h2>
        {description ? <p className="muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
