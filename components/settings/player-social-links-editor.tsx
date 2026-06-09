"use client";

import { Plus, Trash2 } from "lucide-react";
import { AuthField } from "@/components/auth/auth-field";
import { AuthInput } from "@/components/auth/auth-form-controls";
import { Button } from "@/components/ui/button";
import type { PlayerSocialLink } from "@/lib/wiki/player-profile-fields";
import { PLAYER_SOCIAL_LINKS_MAX } from "@/lib/wiki/player-profile-fields";

type PlayerSocialLinksEditorProps = {
  links: PlayerSocialLink[];
  onChange: (links: PlayerSocialLink[]) => void;
};

function newLink(): PlayerSocialLink {
  return { id: crypto.randomUUID(), label: "", url: "" };
}

export function PlayerSocialLinksEditor({ links, onChange }: PlayerSocialLinksEditorProps) {
  const update = (id: string, patch: Partial<PlayerSocialLink>) => {
    onChange(links.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  return (
    <div className="space-y-3">
      {links.map((link) => (
        <div key={link.id} className="grid gap-3 rounded-xl border border-cp-border bg-cp-elevated/30 p-3 sm:grid-cols-2">
          <AuthField label="Platform" htmlFor={`social-label-${link.id}`}>
            <AuthInput
              id={`social-label-${link.id}`}
              value={link.label}
              maxLength={40}
              placeholder="Instagram, YouTube…"
              onChange={(e) => update(link.id, { label: e.target.value })}
            />
          </AuthField>
          <AuthField label="Profile URL" htmlFor={`social-url-${link.id}`}>
            <AuthInput
              id={`social-url-${link.id}`}
              value={link.url}
              maxLength={500}
              placeholder="https://"
              onChange={(e) => update(link.id, { url: e.target.value })}
            />
          </AuthField>
          <div className="sm:col-span-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs font-medium text-destructive hover:underline"
              onClick={() => onChange(links.filter((l) => l.id !== link.id))}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove link
            </button>
          </div>
        </div>
      ))}

      {links.length < PLAYER_SOCIAL_LINKS_MAX ? (
        <Button
          type="button"
          variant="outline"
          className="rounded-lg border-cp-border"
          onClick={() => onChange([...links, newLink()])}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add social link
        </Button>
      ) : (
        <p className="text-xs text-cp-muted">Maximum {PLAYER_SOCIAL_LINKS_MAX} links.</p>
      )}
    </div>
  );
}
