"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildMatchRecap,
  type MatchRecapInput,
} from "@/lib/partners/match-recap";
import { cn } from "@/lib/utils";

type MatchRecapShareCardProps = {
  recap: MatchRecapInput;
  primaryColor?: string;
  className?: string;
  /** Compact inline trigger (default) or always-visible card */
  variant?: "button" | "card";
  /** Controlled dialog (button variant). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Auto-open dialog once when mounted (e.g. right after match finalize). */
  defaultOpen?: boolean;
};

export function MatchRecapShareCard({
  recap,
  primaryColor = "#0d9488",
  className,
  variant = "button",
  open: openProp,
  onOpenChange,
  defaultOpen = false,
}: MatchRecapShareCardProps) {
  const payload = buildMatchRecap(recap);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(
    variant === "card" ? true : defaultOpen,
  );
  const open = openProp ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    onOpenChange?.(next);
    if (openProp === undefined) setUncontrolledOpen(next);
  };
  const [copied, setCopied] = useState(false);

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(payload.shareText);
      setCopied(true);
      toast.success("Recap copied — ready to paste on social");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — select the text manually");
    }
  };

  const shareNative = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: payload.headline,
          text: payload.shareText,
        });
        return;
      } catch {
        // User cancelled or unsupported — fall through to copy.
      }
    }
    await copyShare();
  };

  const card = (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-md",
        className,
      )}
    >
      <div
        className="px-4 py-3 text-white sm:px-5"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}cc 100%)`,
        }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-90">
          Match recap
        </p>
        <p className="mt-1 text-lg font-bold leading-snug sm:text-xl">{payload.headline}</p>
        <p className="mt-1 text-xs opacity-90">{payload.subline}</p>
      </div>
      <div className="space-y-3 px-4 py-4 sm:px-5">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-cp-elevated/50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-cp-muted">
              Side A
            </p>
            <p className="mt-0.5 font-medium text-foreground">{payload.playersA}</p>
          </div>
          <div className="rounded-xl bg-cp-elevated/50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-cp-muted">
              Side B
            </p>
            <p className="mt-0.5 font-medium text-foreground">{payload.playersB}</p>
          </div>
        </div>
        <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-xl border border-cp-border/70 bg-cp-elevated/30 p-3 text-xs leading-relaxed text-cp-muted">
          {payload.shareText}
        </pre>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className="bg-cp-primary hover:bg-cp-primary-light"
            onClick={() => void shareNative()}
          >
            <Share2 className="mr-1.5 h-3.5 w-3.5" />
            Share
          </Button>
          <Button type="button" size="sm" variant="outline" className="border-cp-border" onClick={() => void copyShare()}>
            {copied ? (
              <Check className="mr-1.5 h-3.5 w-3.5" />
            ) : (
              <Copy className="mr-1.5 h-3.5 w-3.5" />
            )}
            {copied ? "Copied" : "Copy text"}
          </Button>
        </div>
      </div>
    </div>
  );

  if (variant === "card") return card;

  return (
    <>
      {openProp === undefined ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn("border-cp-border", className)}
          onClick={() => setOpen(true)}
        >
          <Share2 className="mr-1.5 h-3.5 w-3.5" />
          Share recap
        </Button>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share match recap</DialogTitle>
            <DialogDescription>
              Auto-generated summary — copy or share to social without extra design work.
            </DialogDescription>
          </DialogHeader>
          {card}
        </DialogContent>
      </Dialog>
    </>
  );
}
