type SectionCardProps = {
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function SectionCard({ id, title, description, children }: SectionCardProps) {
  return (
    <section id={id} className="card stack-md">
      <div className="stack-xs">
        <h2>{title}</h2>
        {description ? <p className="muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
