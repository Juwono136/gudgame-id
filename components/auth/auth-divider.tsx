import { cn } from "@/lib/utils";

export function AuthDivider({ className }: { className?: string }) {
  return (
    <div className={cn("relative my-5", className)}>
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <span className="w-full border-t border-cp-border" />
      </div>
      <div className="relative flex justify-center text-xs uppercase tracking-wider">
        <span className="bg-cp-card px-3 text-cp-muted">or</span>
      </div>
    </div>
  );
}
