import { cn } from "@/lib/utils";

type TournamentWizardStepHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  className?: string;
};

export function TournamentWizardStepHeader({
  eyebrow,
  title,
  description,
  className,
}: TournamentWizardStepHeaderProps) {
  return (
    <header
      className={cn(
        "rounded-xl border border-cp-border/80 bg-cp-elevated/40 px-4 py-4 sm:px-5 sm:py-5",
        className,
      )}
    >
      {eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-widest text-cp-primary">
          {eyebrow}
        </p>
      ) : null}
      <h2 className={cn("text-lg font-semibold text-foreground sm:text-xl", eyebrow && "mt-1")}>
        {title}
      </h2>
      <p className="mt-1.5 text-sm leading-relaxed text-cp-muted">{description}</p>
    </header>
  );
}
