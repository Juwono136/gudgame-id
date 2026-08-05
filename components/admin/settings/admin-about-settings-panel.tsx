"use client";

import {
  SiteImageField,
  type SiteImagePendingState,
} from "@/components/admin/settings/site-image-field";
import { RichTextEditor } from "@/components/admin/wiki/rich-text-editor";
import { FieldCharCounter } from "@/components/tournaments/form/field-char-counter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SiteMediaKind } from "@/lib/site/image-specs";
import { coerceRichHtmlField } from "@/lib/wiki/sanitize-rich-text";
import type { HomepageAboutSettings } from "@/lib/validations/homepage-settings";

type AdminAboutSettingsPanelProps = {
  value: HomepageAboutSettings;
  disabled?: boolean;
  pendingImages: Record<SiteMediaKind, SiteImagePendingState>;
  onPendingChange: (kind: SiteMediaKind, next: SiteImagePendingState) => void;
  onChange: <K extends keyof HomepageAboutSettings>(
    key: K,
    value: HomepageAboutSettings[K],
  ) => void;
};

export function AdminAboutSettingsPanel({
  value,
  disabled = false,
  pendingImages,
  onPendingChange,
  onChange,
}: AdminAboutSettingsPanelProps) {
  return (
    <section className="space-y-5 rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">About page</h2>
        <p className="mt-1 text-sm text-cp-muted">
          Content shown on the public <span className="font-medium text-foreground">/about</span>{" "}
          page.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SiteImageField
          kind="about-banner"
          label="Banner background"
          value={value.bannerImageUrl}
          fallbackUrl="/images/bg-03.jpg"
          pending={pendingImages["about-banner"]}
          onPendingChange={(next) => onPendingChange("about-banner", next)}
          disabled={disabled}
        />
        <SiteImageField
          kind="about-image"
          label="About feature image"
          value={value.imageUrl}
          fallbackUrl=""
          pending={pendingImages["about-image"]}
          onPendingChange={(next) => onPendingChange("about-image", next)}
          aspectClassName="aspect-[4/3]"
          disabled={disabled}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="about-badge">Badge text</Label>
          <Input
            id="about-badge"
            value={value.badgeText}
            maxLength={80}
            disabled={disabled}
            onChange={(e) => onChange("badgeText", e.target.value)}
          />
          <FieldCharCounter current={value.badgeText.length} max={80} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="about-title">Title</Label>
          <Input
            id="about-title"
            value={value.title}
            maxLength={120}
            disabled={disabled}
            onChange={(e) => onChange("title", e.target.value)}
          />
          <FieldCharCounter current={value.title.length} max={120} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="about-subtitle">Subtitle</Label>
          <Textarea
            id="about-subtitle"
            value={value.subtitle}
            maxLength={400}
            rows={2}
            disabled={disabled}
            onChange={(e) => onChange("subtitle", e.target.value)}
          />
          <FieldCharCounter current={value.subtitle.length} max={400} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="about-banner-alt">Banner alt text</Label>
          <Input
            id="about-banner-alt"
            value={value.bannerAlt}
            maxLength={200}
            disabled={disabled}
            placeholder="Optional — leave blank if decorative"
            onChange={(e) => onChange("bannerAlt", e.target.value)}
          />
          <FieldCharCounter current={value.bannerAlt.length} max={200} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="about-image-alt">Feature image alt text</Label>
          <Input
            id="about-image-alt"
            value={value.imageAlt}
            maxLength={200}
            disabled={disabled}
            placeholder="Describe the about image"
            onChange={(e) => onChange("imageAlt", e.target.value)}
          />
          <FieldCharCounter current={value.imageAlt.length} max={200} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <p className="text-xs text-cp-muted">
          Main about body. Supports formatting and inline images (JPEG/PNG/WebP). Images upload to
          SeaweedFS when inserted.
        </p>
        <RichTextEditor
          value={coerceRichHtmlField(value.description) ?? value.description}
          onChange={(html) => onChange("description", html)}
          maxLength={20000}
          minHeight={220}
          placeholder="Tell visitors about Gud Game…"
          onUploadImage={async (file) => {
            const body = new FormData();
            body.set("file", file);
            body.set("kind", "about-inline");
            const res = await fetch("/api/admin/platform/homepage-settings/media", {
              method: "POST",
              body,
            });
            const json = (await res.json().catch(() => null)) as {
              data?: { url?: string };
              error?: { message?: string };
            } | null;
            if (!res.ok || !json?.data?.url) {
              throw new Error(json?.error?.message ?? "Image upload failed");
            }
            return json.data.url;
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="about-mission-title">Mission title</Label>
          <Input
            id="about-mission-title"
            value={value.missionTitle}
            maxLength={120}
            disabled={disabled}
            onChange={(e) => onChange("missionTitle", e.target.value)}
          />
          <FieldCharCounter current={value.missionTitle.length} max={120} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="about-mission-body">Mission body</Label>
          <Textarea
            id="about-mission-body"
            value={value.missionBody}
            maxLength={1200}
            rows={3}
            disabled={disabled}
            onChange={(e) => onChange("missionBody", e.target.value)}
          />
          <FieldCharCounter current={value.missionBody.length} max={1200} />
        </div>
      </div>
    </section>
  );
}
