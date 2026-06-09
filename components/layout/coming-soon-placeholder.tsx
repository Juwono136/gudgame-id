import Link from "next/link";
import { Construction } from "lucide-react";
import { Button } from "@/components/ui/button";

type ComingSoonPlaceholderProps = {
  title: string;
  description?: string;
};

export function ComingSoonPlaceholder({ title, description }: ComingSoonPlaceholderProps) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-20">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cp-border bg-cp-card/80 text-cp-primary shadow-sm">
        <Construction className="h-7 w-7" aria-hidden />
      </div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-cp-primary">
        Coming soon
      </p>
      <h2 className="mt-2 text-xl font-bold text-foreground sm:text-2xl">{title}</h2>
      {description ? (
        <p className="mt-3 text-sm leading-relaxed text-cp-muted sm:text-base">{description}</p>
      ) : null}
      <p className="mt-2 text-sm text-cp-text-dim">
        We&apos;re building this section. Check back soon for updates.
      </p>
      <Button asChild variant="outline" className="mt-8 rounded-lg border-cp-border">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
