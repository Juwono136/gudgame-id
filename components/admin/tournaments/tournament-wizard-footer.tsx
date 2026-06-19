"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TournamentWizardFooterProps = {
  backHref?: string;
  backLabel: string;
  onBackLink?: () => void;
  showStepBack: boolean;
  onStepBack: () => void;
  isLast: boolean;
  onNext: () => void;
  onSubmit: () => void;
  isPending: boolean;
  isEdit: boolean;
  className?: string;
};

export function TournamentWizardFooter({
  backHref,
  backLabel,
  onBackLink,
  showStepBack,
  onStepBack,
  isLast,
  onNext,
  onSubmit,
  isPending,
  isEdit,
  className,
}: TournamentWizardFooterProps) {
  return (
    <footer
      className={cn(
        "border-t border-cp-border bg-cp-elevated/40 px-4 py-4 sm:px-6 sm:py-5",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {backHref ? (
          <Link
            href={backHref}
            className="hidden w-fit items-center gap-1.5 text-sm font-medium text-cp-muted transition-colors hover:text-foreground sm:inline-flex"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            {backLabel}
          </Link>
        ) : onBackLink ? (
          <button
            type="button"
            onClick={onBackLink}
            className="hidden w-fit items-center gap-1.5 text-sm font-medium text-cp-muted transition-colors hover:text-foreground sm:inline-flex"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            {backLabel}
          </button>
        ) : null}

        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:shrink-0">
          {showStepBack ? (
            <Button
              type="button"
              variant="outline"
              className="h-10 border-cp-border bg-cp-card px-4"
              onClick={onStepBack}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous step
            </Button>
          ) : null}
          {!isLast ? (
            <Button
              type="button"
              className="h-10 bg-cp-primary px-4 hover:bg-cp-primary-light"
              onClick={onNext}
            >
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              className="h-10 bg-cp-primary px-5 hover:bg-cp-primary-light"
              disabled={isPending}
              onClick={onSubmit}
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEdit ? "Save changes" : "Create tournament"}
            </Button>
          )}
        </div>
      </div>
    </footer>
  );
}
