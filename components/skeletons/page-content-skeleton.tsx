import { Skeleton } from "@/components/ui/skeleton";

export function PageContentSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Skeleton className="h-8 w-48 sm:h-10 sm:w-64" />
      <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      <Skeleton className="mt-2 h-4 w-full max-w-lg" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-cp-border bg-cp-card/40 p-5 space-y-3"
          >
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="mt-4 h-9 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AuthPageSkeleton() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12">
      <Skeleton className="mx-auto h-10 w-40" />
      <Skeleton className="mt-6 h-11 w-full rounded-lg" />
      <Skeleton className="mt-3 h-11 w-full rounded-lg" />
      <Skeleton className="mt-6 h-11 w-full rounded-lg" />
    </div>
  );
}
