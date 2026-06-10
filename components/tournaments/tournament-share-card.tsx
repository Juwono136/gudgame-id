"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type TournamentShareCardProps = {
  url: string;
  tournamentName: string;
};

export function TournamentShareCard({ url, tournamentName }: TournamentShareCardProps) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${tournamentName} — ${url}`)}`;

  return (
    <section className="rounded-2xl border border-cp-border bg-cp-card p-5">
      <h3 className="text-sm font-semibold text-foreground">Share</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-cp-border"
          onClick={() => void copyLink()}
        >
          {copied ? <Check className="mr-2 h-3.5 w-3.5" /> : <Copy className="mr-2 h-3.5 w-3.5" />}
          Copy link
        </Button>
        <Button asChild variant="outline" size="sm" className="border-cp-border">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="mr-2 h-3.5 w-3.5" />
            WhatsApp
          </a>
        </Button>
      </div>
    </section>
  );
}
