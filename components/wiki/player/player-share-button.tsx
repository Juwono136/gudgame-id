"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";

type PlayerShareButtonProps = {
  title: string;
};

export function PlayerShareButton({ title }: PlayerShareButtonProps) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-lg border border-cp-border bg-cp-elevated/50 px-3 py-1.5 text-xs font-medium text-cp-muted transition-colors hover:text-foreground"
      onClick={() => {
        const url = window.location.href;
        if (typeof navigator !== "undefined" && navigator.share) {
          void navigator.share({ title, url });
          return;
        }
        void navigator.clipboard?.writeText(url).then(() => {
          toast.success("Link copied to clipboard");
        });
      }}
    >
      <Share2 className="h-3 w-3" />
      Share
    </button>
  );
}
