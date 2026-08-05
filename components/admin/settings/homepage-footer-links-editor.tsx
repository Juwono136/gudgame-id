"use client";

import { Plus, Trash2 } from "lucide-react";
import { FooterSocialIcon } from "@/components/layout/footer-social-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldCharCounter } from "@/components/tournaments/form/field-char-counter";
import {
  FOOTER_SOCIAL_PLATFORMS,
  type HomepageFooterLink,
  type HomepageSocialLink,
} from "@/lib/validations/homepage-settings";

const PLATFORM_LABELS: Record<(typeof FOOTER_SOCIAL_PLATFORMS)[number], string> = {
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  twitter: "X / Twitter",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  custom: "Custom",
};

type FooterLinksEditorProps = {
  title: string;
  links: HomepageFooterLink[];
  onChange: (links: HomepageFooterLink[]) => void;
  max?: number;
  disabled?: boolean;
};

export function FooterLinksEditor({
  title,
  links,
  onChange,
  max = 12,
  disabled = false,
}: FooterLinksEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-sm font-medium">{title}</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || links.length >= max}
          onClick={() => onChange([...links, { label: "", href: "/" }])}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add link
        </Button>
      </div>
      <ul className="space-y-3">
        {links.map((link, index) => (
          <li
            key={`link-${index}`}
            className="grid gap-2 rounded-xl border border-cp-border bg-cp-elevated/30 p-3 sm:grid-cols-[1fr_1.4fr_auto]"
          >
            <div className="space-y-1.5">
              <Label className="text-xs text-cp-muted">Label</Label>
              <Input
                value={link.label}
                maxLength={60}
                disabled={disabled}
                placeholder="About"
                onChange={(e) => {
                  const next = [...links];
                  next[index] = { ...link, label: e.target.value };
                  onChange(next);
                }}
              />
              <FieldCharCounter current={link.label.length} max={60} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-cp-muted">URL</Label>
              <Input
                value={link.href}
                maxLength={500}
                disabled={disabled}
                placeholder="/about or https://…"
                onChange={(e) => {
                  const next = [...links];
                  next[index] = { ...link, href: e.target.value };
                  onChange(next);
                }}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={disabled || links.length <= 0}
                className="text-destructive"
                aria-label="Remove link"
                onClick={() => onChange(links.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {links.length === 0 ? (
        <p className="text-xs text-cp-muted">No links yet — add at least one if this column should appear.</p>
      ) : null}
    </div>
  );
}

type SocialLinksEditorProps = {
  links: HomepageSocialLink[];
  onChange: (links: HomepageSocialLink[]) => void;
  max?: number;
  disabled?: boolean;
};

export function SocialLinksEditor({
  links,
  onChange,
  max = 12,
  disabled = false,
}: SocialLinksEditorProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Label className="text-sm font-medium">Social / connect links</Label>
          <p className="mt-0.5 text-xs text-cp-muted">
            Pick a platform to auto-apply its brand icon on the public footer.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || links.length >= max}
          onClick={() =>
            onChange([
              ...links,
              { platform: "instagram", label: "Instagram", href: "https://" },
            ])
          }
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add social
        </Button>
      </div>
      <ul className="space-y-3">
        {links.map((link, index) => (
          <li
            key={`social-${index}`}
            className="grid gap-2 rounded-xl border border-cp-border bg-cp-elevated/30 p-3 sm:grid-cols-2 lg:grid-cols-[auto_10rem_1fr_1.2fr_auto]"
          >
            <div className="flex items-end">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full border border-cp-border bg-cp-card text-foreground"
                title={`${PLATFORM_LABELS[link.platform]} icon preview`}
              >
                <FooterSocialIcon platform={link.platform} className="h-4 w-4" />
              </span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-cp-muted">Platform</Label>
              <Select
                value={link.platform}
                disabled={disabled}
                onValueChange={(value) => {
                  const platform = value as HomepageSocialLink["platform"];
                  const next = [...links];
                  next[index] = {
                    ...link,
                    platform,
                    label: PLATFORM_LABELS[platform],
                  };
                  onChange(next);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOOTER_SOCIAL_PLATFORMS.map((platform) => (
                    <SelectItem key={platform} value={platform}>
                      <span className="inline-flex items-center gap-2">
                        <FooterSocialIcon platform={platform} className="h-3.5 w-3.5" />
                        {PLATFORM_LABELS[platform]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-cp-muted">Label</Label>
              <Input
                value={link.label}
                maxLength={60}
                disabled={disabled}
                onChange={(e) => {
                  const next = [...links];
                  next[index] = { ...link, label: e.target.value };
                  onChange(next);
                }}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label className="text-xs text-cp-muted">URL</Label>
              <Input
                value={link.href}
                maxLength={500}
                disabled={disabled}
                placeholder="https://instagram.com/…"
                onChange={(e) => {
                  const next = [...links];
                  next[index] = { ...link, href: e.target.value };
                  onChange(next);
                }}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={disabled}
                className="text-destructive"
                aria-label="Remove social link"
                onClick={() => onChange(links.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
