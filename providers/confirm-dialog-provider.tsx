"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ConfirmDialogVariant = "default" | "destructive";

export type ConfirmOptions = {
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmDialogVariant;
  /** Runs before closing; throw to keep dialog open */
  onConfirm?: () => void | Promise<void>;
};

type ConfirmState = ConfirmOptions & {
  open: boolean;
};

type ConfirmContextValue = {
  /** Opens dialog; resolves true if confirmed, false if cancelled */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmDialogContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback((result: boolean) => {
    setState((prev) => (prev ? { ...prev, open: false } : null));
    resolveRef.current?.(result);
    resolveRef.current = null;
    setIsLoading(false);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({ ...options, open: true });
      setIsLoading(false);
    });
  }, []);

  const handleConfirm = async () => {
    if (!state) return;
    try {
      setIsLoading(true);
      await state.onConfirm?.();
      close(true);
    } catch {
      setIsLoading(false);
    }
  };

  const isDestructive = state?.variant === "destructive";

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}

      <AlertDialog
        open={state?.open ?? false}
        onOpenChange={(open) => {
          if (!open && !isLoading) close(false);
        }}
      >
        <AlertDialogContent className="max-w-[min(100%-2rem,28rem)] gap-5 rounded-2xl border-cp-border bg-cp-card p-5 shadow-xl sm:p-6">
          <AlertDialogHeader className="space-y-2 text-left">
            <AlertDialogTitle className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              {state?.title}
            </AlertDialogTitle>
            {state?.description ? (
              <AlertDialogDescription className="text-sm leading-relaxed text-cp-muted">
                {state.description}
              </AlertDialogDescription>
            ) : (
              <AlertDialogDescription className="sr-only">
                Confirm this action to continue.
              </AlertDialogDescription>
            )}
          </AlertDialogHeader>

          <AlertDialogFooter className="gap-2 sm:gap-3">
            <AlertDialogCancel asChild>
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                className="h-11 w-full rounded-xl border-cp-border bg-cp-elevated/50 text-foreground hover:bg-cp-elevated sm:h-10 sm:w-auto"
                onClick={() => close(false)}
              >
                {state?.cancelLabel ?? "Cancel"}
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                type="button"
                disabled={isLoading}
                className={cn(
                  "btn-interactive h-11 w-full rounded-xl font-semibold sm:h-10 sm:w-auto",
                  isDestructive
                    ? "bg-[#ff6b6b] text-primary-foreground hover:bg-[#e85555]"
                    : "bg-cp-primary text-primary-foreground hover:bg-[#00a67a]",
                )}
                onClick={(e) => {
                  e.preventDefault();
                  void handleConfirm();
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Please wait…
                  </>
                ) : (
                  (state?.confirmLabel ?? "Confirm")
                )}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog(): ConfirmContextValue {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error("useConfirmDialog must be used within ConfirmDialogProvider");
  }
  return ctx;
}
