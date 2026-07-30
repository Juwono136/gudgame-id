"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { PartnerPageHeader } from "@/components/partners/partner-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { Textarea } from "@/components/ui/textarea";
import { dashboardRoutes, partnerPublicRoutes } from "@/lib/constants/routes";
import { parseJsonResponse } from "@/lib/api/parse-json-response";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";

type PartnerMe = {
  id: string;
  slug: string;
  displayName: string;
  logoUrl: string | null;
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

export default function PartnerSettingsPage() {
  const { confirm } = useConfirmDialog();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [partner, setPartner] = useState<PartnerMe | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0d9488");
  const [accentColor, setAccentColor] = useState("#14b8a6");
  const [logoUrl, setLogoUrl] = useState("");
  const [tagline, setTagline] = useState("");
  const [about, setAbout] = useState("");
  const [heroTitle, setHeroTitle] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [contactWebsite, setContactWebsite] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

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
        setTagline(p.branding.tagline ?? "");
        setAbout(p.branding.about ?? "");
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

  const onSave = async () => {
    const slugChanged = partner && slug.trim() !== partner.slug;
    const ok = await confirm({
      title: "Save branding changes?",
      description: slugChanged
        ? `Your public site will move to /${slug.trim()}. Old links to /${partner.slug} will stop working.`
        : "Colors, logo settings, and landing copy will update on your partner site.",
      confirmLabel: "Save branding",
    });
    if (!ok) return;

    setSaving(true);
    try {
      const res = await fetch("/api/partner/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          slug,
          primaryColor,
          accentColor,
          tagline: tagline.trim() || null,
          about: about.trim() || null,
          heroTitle: heroTitle.trim() || null,
          contactEmail: contactEmail.trim() || null,
          contactWhatsapp: contactWhatsapp.trim() || null,
          contactWebsite: contactWebsite.trim() || null,
        }),
      });
      const json = await parseJsonResponse<{ success: true; data: PartnerMe }>(res);
      if (!res.ok || !("data" in json)) {
        throw new Error(
          (json as { error?: { message?: string } }).error?.message ?? "Save failed",
        );
      }
      setPartner(json.data);
      setSlug(json.data.slug);
      setLogoUrl(json.data.logoUrl ?? logoUrl);
      toast.success("Branding saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const onUploadLogo = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
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

    setUploading(true);
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-xl space-y-6">
        <PartnerPageHeader
          backHref={dashboardRoutes.partner}
          backLabel="Partner dashboard"
          title="Branding & landing"
          description={
            <>
              Customize your public site at /{slug || "…"}. Logo, route, colors, and landing copy.
            </>
          }
        />

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-cp-muted" />
          </div>
        ) : (
          <div className="relative space-y-5 overflow-hidden rounded-2xl border border-cp-border bg-cp-card p-5 shadow-sm sm:p-6">
            {saving || uploading ? (
              <LoadingOverlay show label={uploading ? "Uploading logo…" : "Saving…"} />
            ) : null}

            <div
              className="flex items-center gap-3 rounded-xl border border-cp-border/80 bg-gradient-to-br from-cp-elevated/80 to-cp-card p-3"
              style={
                {
                  ["--cp-primary" as string]: primaryColor,
                  ["--partner-accent" as string]: accentColor,
                } as React.CSSProperties
              }
            >
              {logoUrl.trim() ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl.trim()}
                  alt=""
                  className="h-12 w-12 rounded-xl object-cover ring-2 ring-cp-primary/30"
                />
              ) : (
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white"
                  style={{ background: primaryColor }}
                >
                  {(displayName || "P").slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">
                  {displayName || "Partner name"}
                </p>
                <p className="text-xs text-cp-muted">/{slug || "slug"}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="partner-name">Display name</Label>
              <Input
                id="partner-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="border-cp-border bg-cp-bg-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partner-slug">Public route slug</Label>
              <Input
                id="partner-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="border-cp-border bg-cp-bg-input"
              />
              <p className="text-xs text-cp-muted">
                Visitors open{" "}
                <span className="font-medium text-foreground">
                  {partnerPublicRoutes.home(slug || "slug")}
                </span>
              </p>
            </div>

            <div className="space-y-2">
              <Label>Logo</Label>
              <p className="text-xs text-cp-muted">
                JPEG, PNG, WebP, or GIF · max 5 MB. Magic-byte validated on upload.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onUploadLogo(file);
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-cp-border"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload logo
                </Button>
                {logoUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-cp-border text-destructive"
                    disabled={uploading}
                    onClick={() => void onRemoveLogo()}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="partner-primary">Primary color</Label>
                <Input
                  id="partner-primary"
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-11 border-cp-border bg-cp-bg-input p-1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner-accent">Accent color</Label>
                <Input
                  id="partner-accent"
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-11 border-cp-border bg-cp-bg-input p-1"
                />
              </div>
            </div>

            <div className="border-t border-cp-border pt-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-cp-muted">
                Landing page
              </p>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="partner-hero">Hero title (optional)</Label>
                  <Input
                    id="partner-hero"
                    value={heroTitle}
                    onChange={(e) => setHeroTitle(e.target.value)}
                    placeholder="Defaults to display name"
                    className="border-cp-border bg-cp-bg-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partner-tagline">Tagline</Label>
                  <Input
                    id="partner-tagline"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="Short line under your name"
                    maxLength={160}
                    className="border-cp-border bg-cp-bg-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partner-about">About</Label>
                  <Textarea
                    id="partner-about"
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    placeholder="Welcome visitors to your site…"
                    rows={4}
                    maxLength={2000}
                    className="border-cp-border bg-cp-bg-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partner-email">Contact email</Label>
                  <Input
                    id="partner-email"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="border-cp-border bg-cp-bg-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partner-wa">WhatsApp / phone</Label>
                  <Input
                    id="partner-wa"
                    value={contactWhatsapp}
                    onChange={(e) => setContactWhatsapp(e.target.value)}
                    className="border-cp-border bg-cp-bg-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partner-web">Website</Label>
                  <Input
                    id="partner-web"
                    value={contactWebsite}
                    onChange={(e) => setContactWebsite(e.target.value)}
                    placeholder="https://…"
                    className="border-cp-border bg-cp-bg-input"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                onClick={() => void onSave()}
                disabled={saving || uploading}
                className="w-full bg-cp-primary hover:bg-cp-primary-light sm:w-auto"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
        )}
      </div>
    </div>
  );
}
