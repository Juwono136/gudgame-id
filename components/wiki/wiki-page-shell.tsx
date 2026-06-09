import { PageShell } from "@/components/layout/page-shell";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Breadcrumb = { label: string; href?: string };

type WikiPageShellProps = {
  children: React.ReactNode;
  breadcrumbs: Breadcrumb[];
  className?: string;
  showGridBackground?: boolean;
};

export function WikiPageShell({
  children,
  breadcrumbs,
  className,
  showGridBackground = true,
}: WikiPageShellProps) {
  return (
    <PageShell mainClassName="min-h-screen" showGridBackground={showGridBackground}>
      <div className={cn("mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12", className)}>
        <nav className="mb-6 flex flex-wrap items-center gap-1 text-xs text-cp-muted">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 ? <ChevronRight className="h-3 w-3" /> : null}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-cp-logo-accent">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-cp-muted">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
        {children}
      </div>
    </PageShell>
  );
}
