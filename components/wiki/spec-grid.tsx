type SpecGridProps = {
  title: string;
  items: { label: string; value: string }[];
};

export function SpecGrid({ title, items }: SpecGridProps) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-5 cp-shadow-card">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-cp-muted">{title}</h2>
      <dl className="mt-3 divide-y divide-cp-border/60">
        {items.map((item) => (
          <div key={item.label} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0">
            <dt className="text-sm text-cp-muted">{item.label}</dt>
            <dd className="text-right text-sm font-semibold text-foreground">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
