type SpecGridProps = {
  title: string;
  items: { label: string; value: string }[];
};

export function SpecGrid({ title, items }: SpecGridProps) {
  return (
    <section className="rounded-xl border border-cp-border bg-cp-card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-cp-muted">
        {title}
      </h2>
      <dl className="mt-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex justify-between gap-4 border-b border-cp-border/60 pb-2 last:border-0"
          >
            <dt className="text-sm text-cp-muted">{item.label}</dt>
            <dd className="text-right text-sm font-medium text-foreground">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
