"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ExternalLink,
  Loader2,
  Radio,
  Trash2,
  Trophy,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/admin/wiki/rich-text-editor";
import { PartnerLandingHero } from "@/components/partners/partner-landing-hero";
import { PartnerPageHeader } from "@/components/partners/partner-page-header";
import { BrandColorField } from "@/components/tournaments/form/brand-color-field";
import { FieldCharCounter } from "@/components/tournaments/form/field-char-counter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PartnerLoadingOverlay } from "@/components/partners/partner-loading";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { dashboardRoutes, partnerPublicRoutes } from "@/lib/constants/routes";
import {
  aboutPlainLength,
  buildPartnerBrandingPatch,
  hasPartnerBrandingErrors,
  normalizeBrandHex,
  PARTNER_BRANDING_LIMITS,
  type PartnerBrandingFieldErrors,
  validatePartnerBrandingForm,
} from "@/lib/partners/branding-validation";
import { partnerBrandCssVars } from "@/lib/partners/brand-style";
import { normalizePartnerSlug } from "@/lib/partners/constants";
import { validatePartnerIconFile } from "@/lib/partners/icon-validation";
import { partnerPageClass } from "@/lib/partners/layout";
import { validatePartnerLogoFile } from "@/lib/partners/logo-validation";
import { coerceRichHtmlField } from "@/lib/wiki/sanitize-rich-text";
import { cn } from "@/lib/utils";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";

type PartnerMe = {
  id: string;
  slug: string;
  displayName: string;
  logoUrl: string | null;
  iconUrl: string | null;
  branding: {
    primaryColor?: string;
    accentColor?: string;
    tagline?: string;
    about?: string;
    heroTitle?: string;
    contactEmail?: string;
    contactWhatsapp?: string;
    contactWebsite?: string;
  };
};

type UploadKind = "logo" | "icon" | null;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-cp-border bg-cp-card shadow-sm">
      <div className="border-b border-cp-border/80 bg-cp-elevated/25 px-4 py-3.5 sm:px-5">
        <h2 className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-cp-muted sm:text-sm">{description}</p>
        ) : null}
      </div>
      <div className="space-y-4 p-4 sm:space-y-5 sm:p-5">{children}</div>
    </section>
  );
}

export function PartnerBrandingSettingsForm() {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<UploadKind>(null);
  const [partner, setPartner] = useState<PartnerMe | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0d9488");
  const [accentColor, setAccentColor] = useState("#14b8a6");
  const [logoUrl, setLogoUrl] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [tagline, setTagline] = useState("");
  const [about, setAbout] = useState("");
  const [heroTitle, setHeroTitle] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [contactWebsite, setContactWebsite] = useState("");
  const [touched, setTouched] = useState<Partial<Record<keyof PartnerBrandingFieldErrors, boolean>>>(
    {},
  );
  const logoFileRef = useRef<HTMLInputElement>(null);
  const iconFileRef = useRef<HTMLInputElement>(null);

  const formValues = useMemo(
    () => ({
      displayName,
      slug,
      primaryColor,
      accentColor,
      heroTitle,
      tagline,
      about,
      contactEmail,
      contactWhatsapp,
      contactWebsite,
    }),
    [
      displayName,
      slug,
      primaryColor,
      accentColor,
      heroTitle,
      tagline,
      about,
      contactEmail,
      contactWhatsapp,
      contactWebsite,
    ],
  );

  const liveErrors = useMemo(
    () => validatePartnerBrandingForm(formValues),
    [formValues],
  );

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/partner/me");
        const json = await parseJsonResponse<{
          success: true;
          data: { partner: PartnerMe };
        }>(res);
        if (!res.ok || !("data" in json)) throw new Error("Failed to load");
        const p = json.data.partner;
        setPartner(p);
        setDisplayName(p.displayName);
        setSlug(p.slug);
        setPrimaryColor(p.branding.primaryColor ?? "#0d9488");
        setAccentColor(p.branding.accentColor ?? "#14b8a6");
        setLogoUrl(p.logoUrl ?? "");
        setIconUrl(p.iconUrl ?? "");
        setTagline(p.branding.tagline ?? "");
        setAbout(coerceRichHtmlField(p.branding.about) ?? "");
        setHeroTitle(p.branding.heroTitle ?? "");
        setContactEmail(p.branding.contactEmail ?? "");
        setContactWhatsapp(p.branding.contactWhatsapp ?? "");
        setContactWebsite(p.branding.contactWebsite ?? "");
      } catch {
        toast.error("Could not load partner settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const showError = (field: keyof PartnerBrandingFieldErrors) =>
    touched[field] ? liveErrors[field] : undefined;

  const markTouched = (field: keyof PartnerBrandingFieldErrors) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const previewPrimary = normalizeBrandHex(primaryColor);
  const previewAccent = normalizeBrandHex(accentColor, "#14b8a6");
  const previewSlug = normalizePartnerSlug(slug) || "slug";
  const aboutCount = aboutPlainLength(about);
  const busy = saving || uploading !== null;

  const onSave = async () => {
    const nextErrors = validatePartnerBrandingForm(formValues);
    setTouched({
      displayName: true,
      slug: true,
      primaryColor: true,
      accentColor: true,
      heroTitle: true,
      tagline: true,
      about: true,
      contactEmail: true,
      contactWhatsapp: true,
      contactWebsite: true,
    });
    if (hasPartnerBrandingErrors(nextErrors)) {
      toast.error(Object.values(nextErrors)[0] ?? "Fix the highlighted fields");
      return;
    }

    const slugChanged = partner && normalizePartnerSlug(slug) !== partner.slug;
    const ok = await confirm({
      title: "Save branding changes?",
      description: slugChanged
        ? `Your public site will move to /${normalizePartnerSlug(slug)}. Old links to /${partner.slug} will stop working.`
        : "Colors, logo settings, and landing copy will update on your partner site.",
      confirmLabel: "Save branding",
    });
    if (!ok) return;

    setSaving(true);
    try {
      const patch = buildPartnerBrandingPatch(formValues);
      const res = await fetch("/api/partner/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await parseJsonResponse<{ success: true; data: PartnerMe }>(res);
      if (!res.ok || !("data" in json)) {
        throw new Error(
          (json as { error?: { message?: string } }).error?.message ?? "Save failed",
        );
      }
      const updated = json.data;
      setPartner(updated);
      setDisplayName(updated.displayName);
      setSlug(updated.slug);
      setPrimaryColor(updated.branding.primaryColor ?? patch.primaryColor);
      setAccentColor(updated.branding.accentColor ?? patch.accentColor);
      setLogoUrl(updated.logoUrl ?? logoUrl);
      setIconUrl(updated.iconUrl ?? iconUrl);
      setTagline(updated.branding.tagline ?? "");
      setAbout(coerceRichHtmlField(updated.branding.about) ?? "");
      setHeroTitle(updated.branding.heroTitle ?? "");
      setContactEmail(updated.branding.contactEmail ?? "");
      setContactWhatsapp(updated.branding.contactWhatsapp ?? "");
      setContactWebsite(updated.branding.contactWebsite ?? "");
      toast.success("Branding saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onUploadLogo = async (file: File) => {
    const validation = validatePartnerLogoFile(file);
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }

    setUploading("logo");
    try {
      const form = new FormData();
      form.append("file", validation.file);
      const res = await fetch("/api/partner/logo", { method: "POST", body: form });
      const json = await parseJsonResponse<{
        success: true;
        data: { partner: PartnerMe; url: string };
      }>(res);
      if (!res.ok || !("data" in json)) {
        throw new Error(
          (json as { error?: { message?: string } }).error?.message ?? "Upload failed",
        );
      }
      setPartner(json.data.partner);
      setLogoUrl(json.data.url);
      toast.success("Logo uploaded");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
      if (logoFileRef.current) logoFileRef.current.value = "";
    }
  };

  const onRemoveLogo = async () => {
    const ok = await confirm({
      title: "Remove partner logo?",
      description: "Your site will fall back to the letter mark until you upload a new logo.",
      confirmLabel: "Remove logo",
      variant: "destructive",
    });
    if (!ok) return;

    setUploading("logo");
    try {
      const res = await fetch("/api/partner/logo", { method: "DELETE" });
      const json = await parseJsonResponse<{
        success: true;
        data: { partner: PartnerMe };
      }>(res);
      if (!res.ok || !("data" in json)) {
        throw new Error(
          (json as { error?: { message?: string } }).error?.message ?? "Remove failed",
        );
      }
      setPartner(json.data.partner);
      setLogoUrl("");
      toast.success("Logo removed");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setUploading(null);
    }
  };

  const onUploadIcon = async (file: File) => {
    const validation = validatePartnerIconFile(file);
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }

    setUploading("icon");
    try {
      const form = new FormData();
      form.append("file", validation.file);
      const res = await fetch("/api/partner/icon", { method: "POST", body: form });
      const json = await parseJsonResponse<{
        success: true;
        data: { partner: PartnerMe; url: string };
      }>(res);
      if (!res.ok || !("data" in json)) {
        throw new Error(
          (json as { error?: { message?: string } }).error?.message ?? "Upload failed",
        );
      }
      setPartner(json.data.partner);
      setIconUrl(json.data.url);
      toast.success("Brand icon uploaded");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
      if (iconFileRef.current) iconFileRef.current.value = "";
    }
  };

  const onRemoveIcon = async () => {
    const ok = await confirm({
      title: "Remove brand icon?",
      description: "Browser tabs will fall back to the site logo or default favicon.",
      confirmLabel: "Remove icon",
      variant: "destructive",
    });
    if (!ok) return;

    setUploading("icon");
    try {
      const res = await fetch("/api/partner/icon", { method: "DELETE" });
      const json = await parseJsonResponse<{
        success: true;
        data: { partner: PartnerMe };
      }>(res);
      if (!res.ok || !("data" in json)) {
        throw new Error(
          (json as { error?: { message?: string } }).error?.message ?? "Remove failed",
        );
      }
      setPartner(json.data.partner);
      setIconUrl("");
      toast.success("Brand icon removed");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setUploading(null);
    }
  };

  return (
    <div
      className={partnerPageClass("relative min-w-0 space-y-6 py-6 sm:space-y-8 sm:py-10")}
      style={partnerBrandCssVars(previewPrimary, previewAccent)}
    >
      <PartnerPageHeader
        backHref={dashboardRoutes.partner}
        backLabel="Partner dashboard"
        title="Branding & landing"
        description={
          <>
            Customize your public site at{" "}
            <span className="font-medium text-foreground">/{previewSlug}</span>
            . Logo, route, colors, and landing copy update live in the preview.
          </>
        }
        actions={
          partner ? (
            <Button asChild variant="outline" className="border-cp-border">
              <Link
                href={partnerPublicRoutes.home(partner.slug)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                Open public site
              </Link>
            </Button>
          ) : null
        }
      />

      {loading ? (
        <div className="flex justify-center rounded-2xl border border-cp-border bg-cp-card py-20">
          <Loader2 className="h-6 w-6 animate-spin text-cp-muted" aria-label="Loading" />
        </div>
      ) : (
        <div className="relative grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)]">
          {busy ? (
            <PartnerLoadingOverlay
              show
              variant="fullscreen"
              label={
                uploading === "icon"
                  ? "Uploading icon…"
                  : uploading === "logo"
                    ? "Uploading logo…"
                    : "Saving…"
              }
            />
          ) : null}

          <div className="min-w-0 space-y-5">
            <SectionCard
              title="Identity"
              description="Name, public route, and logo shown across your partner site."
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="partner-name">Display name</Label>
                  <FieldCharCounter
                    current={displayName.length}
                    max={PARTNER_BRANDING_LIMITS.displayName}
                  />
                </div>
                <Input
                  id="partner-name"
                  value={displayName}
                  maxLength={PARTNER_BRANDING_LIMITS.displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onBlur={() => markTouched("displayName")}
                  aria-invalid={Boolean(showError("displayName"))}
                  className="border-cp-border bg-cp-bg-input"
                />
                <FieldError message={showError("displayName")} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="partner-slug">Public route slug</Label>
                  <FieldCharCounter current={slug.length} max={PARTNER_BRANDING_LIMITS.slug} />
                </div>
                <Input
                  id="partner-slug"
                  value={slug}
                  maxLength={PARTNER_BRANDING_LIMITS.slug}
                  onChange={(e) => setSlug(e.target.value)}
                  onBlur={() => {
                    setSlug(normalizePartnerSlug(slug));
                    markTouched("slug");
                  }}
                  spellCheck={false}
                  autoComplete="off"
                  aria-invalid={Boolean(showError("slug"))}
                  className="border-cp-border bg-cp-bg-input font-mono text-sm"
                />
                <p className="text-xs text-cp-muted">
                  Visitors open{" "}
                  <span className="font-medium text-foreground">
                    {partnerPublicRoutes.home(previewSlug)}
                  </span>
                </p>
                <FieldError message={showError("slug")} />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <p className="text-xs text-cp-muted">
                    Shown on the landing hero and navigation. JPEG, PNG, WebP, or GIF · max 5 MB.
                  </p>
                  <input
                    ref={logoFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void onUploadLogo(file);
                    }}
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    {logoUrl.trim() ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoUrl.trim()}
                        alt=""
                        className="h-12 w-12 rounded-xl object-cover ring-1 ring-cp-border"
                      />
                    ) : (
                      <span
                        className="flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold text-white"
                        style={{ background: previewPrimary }}
                      >
                        {(displayName || "P").slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-cp-border"
                        disabled={busy}
                        onClick={() => logoFileRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" aria-hidden />
                        Upload logo
                      </Button>
                      {logoUrl ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="border-destructive/40 text-destructive hover:bg-destructive/10"
                          disabled={busy}
                          onClick={() => void onRemoveLogo()}
                        >
                          <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Brand icon</Label>
                  <p className="text-xs text-cp-muted">
                    Favicon for browser tabs. Square PNG recommended · max 2 MB.
                  </p>
                  <input
                    ref={iconFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void onUploadIcon(file);
                    }}
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    {iconUrl.trim() ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={iconUrl.trim()}
                        alt=""
                        className="h-12 w-12 rounded-lg object-cover ring-1 ring-cp-border"
                      />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-cp-border bg-cp-elevated/40 text-[10px] font-semibold uppercase tracking-wide text-cp-muted">
                        Icon
                      </span>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-cp-border"
                        disabled={busy}
                        onClick={() => iconFileRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" aria-hidden />
                        Upload icon
                      </Button>
                      {iconUrl ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="border-destructive/40 text-destructive hover:bg-destructive/10"
                          disabled={busy}
                          onClick={() => void onRemoveIcon()}
                        >
                          <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Brand colors"
              description="Primary drives buttons and accents; accent softens highlights."
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <BrandColorField
                    id="partner-primary"
                    label="Primary color"
                    value={primaryColor}
                    onChange={setPrimaryColor}
                  />
                  <FieldError message={showError("primaryColor")} />
                </div>
                <div className="space-y-2">
                  <BrandColorField
                    id="partner-accent"
                    label="Accent color"
                    value={accentColor}
                    onChange={setAccentColor}
                  />
                  <FieldError message={showError("accentColor")} />
                </div>
              </div>
              <div
                className="flex h-3 overflow-hidden rounded-full border border-cp-border"
                aria-hidden
              >
                <span className="flex-1" style={{ background: previewPrimary }} />
                <span className="flex-1" style={{ background: previewAccent }} />
              </div>
            </SectionCard>

            <SectionCard
              title="Landing page"
              description="Hero copy and contact details on your public home page."
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="partner-hero">Hero title (optional)</Label>
                  <FieldCharCounter
                    current={heroTitle.length}
                    max={PARTNER_BRANDING_LIMITS.heroTitle}
                  />
                </div>
                <Input
                  id="partner-hero"
                  value={heroTitle}
                  maxLength={PARTNER_BRANDING_LIMITS.heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value)}
                  onBlur={() => markTouched("heroTitle")}
                  placeholder="Defaults to display name"
                  aria-invalid={Boolean(showError("heroTitle"))}
                  className="border-cp-border bg-cp-bg-input"
                />
                <FieldError message={showError("heroTitle")} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="partner-tagline">Tagline</Label>
                  <FieldCharCounter
                    current={tagline.length}
                    max={PARTNER_BRANDING_LIMITS.tagline}
                  />
                </div>
                <Input
                  id="partner-tagline"
                  value={tagline}
                  maxLength={PARTNER_BRANDING_LIMITS.tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  onBlur={() => markTouched("tagline")}
                  placeholder="Short line under your name"
                  aria-invalid={Boolean(showError("tagline"))}
                  className="border-cp-border bg-cp-bg-input"
                />
                <FieldError message={showError("tagline")} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>About</Label>
                  <FieldCharCounter
                    current={aboutCount}
                    max={PARTNER_BRANDING_LIMITS.aboutPlain}
                  />
                </div>
                <RichTextEditor
                  value={about}
                  onChange={(html) => {
                    setAbout(html);
                    markTouched("about");
                  }}
                  placeholder="Welcome visitors to your site…"
                  minHeight={160}
                  maxLength={PARTNER_BRANDING_LIMITS.aboutHtml}
                  className={cn(showError("about") && "ring-1 ring-destructive/50")}
                />
                <p className="text-xs text-cp-muted">
                  Supports bold, lists, and links. Plain text limit{" "}
                  {PARTNER_BRANDING_LIMITS.aboutPlain.toLocaleString()} characters.
                </p>
                <FieldError message={showError("about")} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="partner-email">Contact email</Label>
                    <FieldCharCounter
                      current={contactEmail.length}
                      max={PARTNER_BRANDING_LIMITS.contactEmail}
                    />
                  </div>
                  <Input
                    id="partner-email"
                    type="email"
                    value={contactEmail}
                    maxLength={PARTNER_BRANDING_LIMITS.contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    onBlur={() => markTouched("contactEmail")}
                    placeholder="hello@example.com"
                    aria-invalid={Boolean(showError("contactEmail"))}
                    className="border-cp-border bg-cp-bg-input"
                  />
                  <FieldError message={showError("contactEmail")} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="partner-wa">WhatsApp / phone</Label>
                    <FieldCharCounter
                      current={contactWhatsapp.length}
                      max={PARTNER_BRANDING_LIMITS.contactWhatsapp}
                    />
                  </div>
                  <Input
                    id="partner-wa"
                    value={contactWhatsapp}
                    maxLength={PARTNER_BRANDING_LIMITS.contactWhatsapp}
                    onChange={(e) => setContactWhatsapp(e.target.value)}
                    onBlur={() => markTouched("contactWhatsapp")}
                    placeholder="+62 …"
                    aria-invalid={Boolean(showError("contactWhatsapp"))}
                    className="border-cp-border bg-cp-bg-input"
                  />
                  <FieldError message={showError("contactWhatsapp")} />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="partner-web">Website</Label>
                    <FieldCharCounter
                      current={contactWebsite.length}
                      max={PARTNER_BRANDING_LIMITS.contactWebsite}
                    />
                  </div>
                  <Input
                    id="partner-web"
                    value={contactWebsite}
                    maxLength={PARTNER_BRANDING_LIMITS.contactWebsite}
                    onChange={(e) => setContactWebsite(e.target.value)}
                    onBlur={() => markTouched("contactWebsite")}
                    placeholder="https://…"
                    aria-invalid={Boolean(showError("contactWebsite"))}
                    className="border-cp-border bg-cp-bg-input"
                  />
                  <FieldError message={showError("contactWebsite")} />
                </div>
              </div>
            </SectionCard>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                onClick={() => void onSave()}
                disabled={busy}
                className="w-full bg-cp-primary hover:bg-cp-primary-light sm:w-auto"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  "Save branding"
                )}
              </Button>
              {partner ? (
                <Button asChild variant="outline" className="border-cp-border">
                  <Link
                    href={partnerPublicRoutes.home(partner.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open public site
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>

          <aside className="min-w-0 lg:sticky lg:top-24">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 px-0.5">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cp-muted">
                    Live preview
                  </p>
                  <p className="mt-0.5 text-xs text-cp-muted">Matches your public landing hero</p>
                </div>
                {iconUrl.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={iconUrl.trim()}
                    alt=""
                    title="Brand icon (favicon)"
                    className="h-7 w-7 rounded-md object-cover ring-1 ring-cp-border"
                  />
                ) : null}
              </div>

              <div>
                <PartnerLandingHero
                  compact
                  interactive={false}
                  displayName={displayName.trim() || "Partner name"}
                  slug={previewSlug}
                  logoUrl={logoUrl.trim() || null}
                  primaryColor={previewPrimary}
                  accentColor={previewAccent}
                  heroTitle={heroTitle}
                  tagline={tagline}
                  about={aboutCount > 0 ? about : null}
                  contactEmail={contactEmail}
                  contactWhatsapp={contactWhatsapp}
                  contactWebsite={contactWebsite}
                  stats={[
                    { icon: CalendarDays, label: "Tournaments", shortLabel: "Events", value: 0 },
                    { icon: Radio, label: "Live / upcoming", shortLabel: "Active", value: 0 },
                    { icon: Trophy, label: "Leagues", shortLabel: "Leagues", value: 0 },
                  ]}
                />
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
