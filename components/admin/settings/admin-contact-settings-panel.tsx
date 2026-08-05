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
import type { HomepageContactSettings } from "@/lib/validations/homepage-settings";

type AdminContactSettingsPanelProps = {
  value: HomepageContactSettings;
  disabled?: boolean;
  pendingImages: Record<SiteMediaKind, SiteImagePendingState>;
  onPendingChange: (kind: SiteMediaKind, next: SiteImagePendingState) => void;
  onChange: <K extends keyof HomepageContactSettings>(
    key: K,
    value: HomepageContactSettings[K],
  ) => void;
};

export function AdminContactSettingsPanel({
  value,
  disabled = false,
  pendingImages,
  onPendingChange,
  onChange,
}: AdminContactSettingsPanelProps) {
  return (
    <section className="space-y-5 rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
      <div>
        <h2 className="text-base font-semibold text-foreground">Contact Us page</h2>
        <p className="mt-1 text-sm text-cp-muted">
          Content shown on the public <span className="font-medium text-foreground">/contact</span>{" "}
          page. Banner images upload to SeaweedFS only when you save.
        </p>
      </div>

      <SiteImageField
        kind="contact-banner"
        label="Banner background"
        value={value.bannerImageUrl}
        fallbackUrl="/images/bg-03.jpg"
        pending={pendingImages["contact-banner"]}
        onPendingChange={(next) => onPendingChange("contact-banner", next)}
        disabled={disabled}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="contact-badge">Badge text</Label>
          <Input
            id="contact-badge"
            value={value.badgeText}
            maxLength={80}
            disabled={disabled}
            onChange={(e) => onChange("badgeText", e.target.value)}
          />
          <FieldCharCounter current={value.badgeText.length} max={80} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact-title">Title</Label>
          <Input
            id="contact-title"
            value={value.title}
            maxLength={120}
            disabled={disabled}
            onChange={(e) => onChange("title", e.target.value)}
          />
          <FieldCharCounter current={value.title.length} max={120} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="contact-subtitle">Subtitle</Label>
          <Textarea
            id="contact-subtitle"
            value={value.subtitle}
            maxLength={400}
            rows={2}
            disabled={disabled}
            onChange={(e) => onChange("subtitle", e.target.value)}
          />
          <FieldCharCounter current={value.subtitle.length} max={400} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="contact-banner-alt">Banner alt text</Label>
          <Input
            id="contact-banner-alt"
            value={value.bannerAlt}
            maxLength={200}
            disabled={disabled}
            placeholder="Optional — leave blank if decorative"
            onChange={(e) => onChange("bannerAlt", e.target.value)}
          />
          <FieldCharCounter current={value.bannerAlt.length} max={200} />
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-cp-border/80 bg-cp-elevated/30 p-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Intro card</h3>
          <p className="mt-0.5 text-xs text-cp-muted">
            Left-column card heading and supporting line above the description.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="contact-intro-title">Intro card title</Label>
            <Input
              id="contact-intro-title"
              value={value.introCardTitle}
              maxLength={80}
              disabled={disabled}
              onChange={(e) => onChange("introCardTitle", e.target.value)}
            />
            <FieldCharCounter current={value.introCardTitle.length} max={80} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-intro-subtitle">Intro card subtitle</Label>
            <Input
              id="contact-intro-subtitle"
              value={value.introCardSubtitle}
              maxLength={240}
              disabled={disabled}
              onChange={(e) => onChange("introCardSubtitle", e.target.value)}
            />
            <FieldCharCounter current={value.introCardSubtitle.length} max={240} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Intro description</Label>
          <RichTextEditor
            value={coerceRichHtmlField(value.description) ?? value.description}
            onChange={(html) => onChange("description", html)}
            maxLength={4000}
            minHeight={120}
            placeholder="How visitors can reach you…"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="contact-cta">Email CTA label</Label>
            <Input
              id="contact-cta"
              value={value.ctaLabel}
              maxLength={60}
              disabled={disabled}
              onChange={(e) => onChange("ctaLabel", e.target.value)}
            />
            <FieldCharCounter current={value.ctaLabel.length} max={60} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-maps-cta">Maps CTA label</Label>
            <Input
              id="contact-maps-cta"
              value={value.mapsCtaLabel}
              maxLength={60}
              disabled={disabled}
              onChange={(e) => onChange("mapsCtaLabel", e.target.value)}
            />
            <FieldCharCounter current={value.mapsCtaLabel.length} max={60} />
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-cp-border/80 bg-cp-elevated/30 p-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Business & contact details</h3>
          <p className="mt-0.5 text-xs text-cp-muted">
            Legal entity block and sidebar channels on the public Contact page.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="contact-legal-section">Legal section title</Label>
            <Input
              id="contact-legal-section"
              value={value.legalSectionTitle}
              maxLength={80}
              disabled={disabled}
              onChange={(e) => onChange("legalSectionTitle", e.target.value)}
            />
            <FieldCharCounter current={value.legalSectionTitle.length} max={80} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-product">Product name</Label>
            <Input
              id="contact-product"
              value={value.productName}
              maxLength={80}
              disabled={disabled}
              onChange={(e) => onChange("productName", e.target.value)}
            />
            <FieldCharCounter current={value.productName.length} max={80} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="contact-legal">Legal company name</Label>
            <Input
              id="contact-legal"
              value={value.companyLegalName}
              maxLength={160}
              disabled={disabled}
              placeholder="PT …"
              onChange={(e) => onChange("companyLegalName", e.target.value)}
            />
            <FieldCharCounter current={value.companyLegalName.length} max={160} />
            <p className="text-xs text-cp-muted">
              Shown publicly for business verification (e.g. payment gateway reviews).
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-email">Support email</Label>
            <Input
              id="contact-email"
              type="email"
              value={value.supportEmail}
              maxLength={160}
              disabled={disabled}
              onChange={(e) => onChange("supportEmail", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-email-hint">Email hint (optional)</Label>
            <Input
              id="contact-email-hint"
              value={value.emailHint}
              maxLength={120}
              disabled={disabled}
              placeholder="Primary support & business inquiries"
              onChange={(e) => onChange("emailHint", e.target.value)}
            />
            <FieldCharCounter current={value.emailHint.length} max={120} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-phone">Phone (optional)</Label>
            <Input
              id="contact-phone"
              value={value.phone}
              maxLength={60}
              disabled={disabled}
              placeholder="+62 …"
              onChange={(e) => onChange("phone", e.target.value)}
            />
            <FieldCharCounter current={value.phone.length} max={60} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-hours">Office hours (optional)</Label>
            <Input
              id="contact-hours"
              value={value.officeHours}
              maxLength={240}
              disabled={disabled}
              placeholder="Mon–Fri, 09:00–17:00 WIB"
              onChange={(e) => onChange("officeHours", e.target.value)}
            />
            <FieldCharCounter current={value.officeHours.length} max={240} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="contact-address">Registered address</Label>
            <Textarea
              id="contact-address"
              value={value.address}
              maxLength={320}
              rows={2}
              disabled={disabled}
              onChange={(e) => onChange("address", e.target.value)}
            />
            <FieldCharCounter current={value.address.length} max={320} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="contact-website">Website URL</Label>
            <Input
              id="contact-website"
              value={value.websiteUrl}
              maxLength={500}
              disabled={disabled}
              placeholder="https://gudgame.id"
              onChange={(e) => onChange("websiteUrl", e.target.value)}
            />
            <FieldCharCounter current={value.websiteUrl.length} max={500} />
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-cp-border/80 bg-cp-elevated/30 p-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Map & location</h3>
          <p className="mt-0.5 text-xs text-cp-muted">
            Paste a Google Maps share link (maps.google.com or maps.app.goo.gl). The Google Maps
            preview is shown only on the public Contact Us page — not here.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="contact-maps-section">Maps section title</Label>
            <Input
              id="contact-maps-section"
              value={value.mapsSectionTitle}
              maxLength={80}
              disabled={disabled}
              onChange={(e) => onChange("mapsSectionTitle", e.target.value)}
            />
            <FieldCharCounter current={value.mapsSectionTitle.length} max={80} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-maps">Maps URL (optional)</Label>
            <Input
              id="contact-maps"
              value={value.mapsUrl}
              maxLength={500}
              disabled={disabled}
              placeholder="https://maps.app.goo.gl/… or https://maps.google.com/…"
              onChange={(e) => onChange("mapsUrl", e.target.value)}
            />
            <FieldCharCounter current={value.mapsUrl.length} max={500} />
          </div>
        </div>
      </div>
    </section>
  );
}
