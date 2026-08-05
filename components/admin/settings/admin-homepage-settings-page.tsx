"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ExternalLink, LayoutTemplate, ListTree, PanelBottom, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/layout/admin-shell";
import {
  SiteImageField,
  type SiteImagePendingState,
} from "@/components/admin/settings/site-image-field";
import {
  FooterLinksEditor,
  SocialLinksEditor,
} from "@/components/admin/settings/homepage-footer-links-editor";
import { RichTextEditor } from "@/components/admin/wiki/rich-text-editor";
import { WorkspaceTabs } from "@/components/dashboard/workspace-tabs";
import { FieldCharCounter } from "@/components/tournaments/form/field-char-counter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { AdminSessionContext } from "@/lib/admin/types";
import { brandAssets } from "@/lib/config/site";
import { adminRoutes } from "@/lib/constants/routes";
import type { SiteMediaKind } from "@/lib/site/image-specs";
import { coerceRichHtmlField } from "@/lib/wiki/sanitize-rich-text";
import {
  homepageSettingsSchema,
  type HomepageSettingsInput,
} from "@/lib/validations/homepage-settings";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";

const EMPTY_PENDING: SiteImagePendingState = { file: null, cleared: false };

type PendingImages = Record<SiteMediaKind, SiteImagePendingState>;

const TABS = [
  {
    id: "hero",
    label: "Hero section",
    description: "Banner, logo, badge, titles, and search placeholder on the homepage hero.",
    icon: LayoutTemplate,
  },
  {
    id: "sports",
    label: "Choose your sport",
    description: "Section badge, heading, and supporting copy above the sports cards.",
    icon: ListTree,
  },
  {
    id: "footer",
    label: "Footer",
    description: "Brand blurb, contact details, site/legal menus, and social links.",
    icon: PanelBottom,
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

function isTabId(value: string | null): value is TabId {
  return TABS.some((tab) => tab.id === value);
}

type AdminHomepageSettingsPageProps = {
  context: AdminSessionContext;
  initialSettings: HomepageSettingsInput;
};

async function uploadSiteImageOnSave(
  kind: SiteMediaKind,
  file: File,
  previousUrl: string,
): Promise<string> {
  const body = new FormData();
  body.set("file", file);
  body.set("kind", kind);
  if (previousUrl) body.set("previousUrl", previousUrl);
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
}

async function clearSiteImageOnSave(
  kind: SiteMediaKind,
  previousUrl: string,
): Promise<void> {
  const params = new URLSearchParams({ kind });
  if (previousUrl) params.set("previousUrl", previousUrl);
  const res = await fetch(
    `/api/admin/platform/homepage-settings/media?${params.toString()}`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(json?.error?.message ?? "Failed to clear previous image");
  }
}

const IMAGE_FIELD_MAP: {
  kind: SiteMediaKind;
  getUrl: (s: HomepageSettingsInput) => string;
  setUrl: (s: HomepageSettingsInput, url: string) => HomepageSettingsInput;
  fallback: string;
}[] = [
  {
    kind: "hero-banner",
    getUrl: (s) => s.hero.bannerImageUrl,
    setUrl: (s, url) => ({ ...s, hero: { ...s.hero, bannerImageUrl: url } }),
    fallback: "/images/bg-03.jpg",
  },
  {
    kind: "hero-logo",
    getUrl: (s) => s.hero.logoUrl,
    setUrl: (s, url) => ({ ...s, hero: { ...s.hero, logoUrl: url } }),
    fallback: brandAssets.logo,
  },
  {
    kind: "footer-logo",
    getUrl: (s) => s.footer.logoUrl,
    setUrl: (s, url) => ({ ...s, footer: { ...s.footer, logoUrl: url } }),
    fallback: brandAssets.logo,
  },
];

function firstZodMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const flat = error as {
    formErrors?: string[];
    fieldErrors?: Record<string, string[] | undefined>;
  };
  if (flat.formErrors?.[0]) return flat.formErrors[0];
  if (flat.fieldErrors) {
    for (const messages of Object.values(flat.fieldErrors)) {
      if (messages?.[0]) return messages[0];
    }
  }
  return null;
}

export function AdminHomepageSettingsPage({
  context,
  initialSettings,
}: AdminHomepageSettingsPageProps) {
  const { confirm } = useConfirmDialog();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const activeTab: TabId = isTabId(rawTab) ? rawTab : "hero";

  const [settings, setSettings] = useState<HomepageSettingsInput>(initialSettings);
  const [pendingImages, setPendingImages] = useState<PendingImages>({
    "hero-banner": EMPTY_PENDING,
    "hero-logo": EMPTY_PENDING,
    "footer-logo": EMPTY_PENDING,
  });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  const setPending = (kind: SiteMediaKind, next: SiteImagePendingState) => {
    setPendingImages((prev) => ({ ...prev, [kind]: next }));
  };

  const setActiveTab = useCallback(
    (tabId: TabId) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tabId === "hero") params.delete("tab");
      else params.set("tab", tabId);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const patchHero = <K extends keyof HomepageSettingsInput["hero"]>(
    key: K,
    value: HomepageSettingsInput["hero"][K],
  ) => {
    setSettings((prev) => ({ ...prev, hero: { ...prev.hero, [key]: value } }));
  };

  const patchSports = <K extends keyof HomepageSettingsInput["sportsSection"]>(
    key: K,
    value: HomepageSettingsInput["sportsSection"][K],
  ) => {
    setSettings((prev) => ({
      ...prev,
      sportsSection: { ...prev.sportsSection, [key]: value },
    }));
  };

  const patchFooter = <K extends keyof HomepageSettingsInput["footer"]>(
    key: K,
    value: HomepageSettingsInput["footer"][K],
  ) => {
    setSettings((prev) => ({ ...prev, footer: { ...prev.footer, [key]: value } }));
  };

  const save = async () => {
    const preflight = homepageSettingsSchema.safeParse(settings);
    if (!preflight.success) {
      const message =
        firstZodMessage(preflight.error.flatten()) ?? "Please fix the highlighted fields.";
      toast.error(message);
      return;
    }

    const ok = await confirm({
      title: "Publish homepage content?",
      description:
        "Pending images upload to SeaweedFS on save (replacing the previous file for each slot). Homepage copy and footer update for all visitors.",
      confirmLabel: "Save & publish",
      cancelLabel: "Cancel",
    });
    if (!ok) return;

    setSaving(true);
    try {
      let nextSettings = settings;
      for (const field of IMAGE_FIELD_MAP) {
        const pending = pendingImages[field.kind];
        const previousUrl = field.getUrl(settings);
        if (pending.file) {
          const url = await uploadSiteImageOnSave(field.kind, pending.file, previousUrl);
          nextSettings = field.setUrl(nextSettings, url);
        } else if (pending.cleared) {
          await clearSiteImageOnSave(field.kind, previousUrl);
          nextSettings = field.setUrl(nextSettings, field.fallback);
        }
      }

      const parsed = homepageSettingsSchema.safeParse(nextSettings);
      if (!parsed.success) {
        const message =
          firstZodMessage(parsed.error.flatten()) ?? "Please fix the highlighted fields.";
        toast.error(message);
        return;
      }

      const res = await fetch("/api/admin/platform/homepage-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = (await res.json().catch(() => null)) as {
        data?: { settings?: HomepageSettingsInput };
        error?: { message?: string; context?: { issues?: unknown } };
      } | null;
      if (!res.ok || !json?.data?.settings) {
        const fromFields = firstZodMessage(json?.error?.context?.issues);
        throw new Error(fromFields ?? json?.error?.message ?? "Save failed");
      }
      setSettings(json.data.settings);
      setPendingImages({
        "hero-banner": EMPTY_PENDING,
        "hero-logo": EMPTY_PENDING,
        "footer-logo": EMPTY_PENDING,
      });
      toast.success("Homepage content published");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner label="Loading system settings…" />
      </div>
    );
  }

  return (
    <AdminShell
      context={context}
      title="System Settings"
      breadcrumbs={[
        { label: "Dashboard", href: adminRoutes.home },
        { label: "System Settings" },
      ]}
    >
      <LoadingOverlay
        show={saving}
        label={
          Object.values(pendingImages).some((p) => p.file || p.cleared)
            ? "Uploading images to SeaweedFS & publishing…"
            : "Publishing homepage content…"
        }
      />

      <div className="mx-auto max-w-5xl space-y-5 sm:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl space-y-2">
            <div className="flex items-start gap-3 rounded-2xl border border-cp-primary/20 bg-cp-primary/5 px-4 py-3">
              <Settings2 className="mt-0.5 h-5 w-5 shrink-0 text-cp-primary" />
              <p className="text-xs leading-relaxed text-cp-muted sm:text-sm">
                Manage public homepage content for Gud Game. Sport cards themselves are still
                managed under{" "}
                <span className="font-medium text-foreground">Sports</span> — this page controls
                section copy, hero media, and the global footer.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button type="button" variant="outline" asChild>
              <a href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Preview site
              </a>
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              Save changes
            </Button>
          </div>
        </div>

        <WorkspaceTabs
          tabs={[...TABS]}
          activeId={activeTab}
          onChange={(id) => {
            if (isTabId(id)) setActiveTab(id);
          }}
        >
        {activeTab === "hero" ? (
          <section className="space-y-5 rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
            <h2 className="text-base font-semibold text-foreground">Hero section</h2>
            <div className="grid gap-5 lg:grid-cols-2">
              <SiteImageField
                kind="hero-banner"
                label="Banner background"
                value={settings.hero.bannerImageUrl}
                fallbackUrl="/images/bg-03.jpg"
                pending={pendingImages["hero-banner"]}
                onPendingChange={(next) => setPending("hero-banner", next)}
                disabled={saving}
              />
              <SiteImageField
                kind="hero-logo"
                label="Hero logo"
                value={settings.hero.logoUrl}
                fallbackUrl={brandAssets.logo}
                pending={pendingImages["hero-logo"]}
                onPendingChange={(next) => setPending("hero-logo", next)}
                aspectClassName="aspect-[3/1]"
                disabled={saving}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="hero-badge">Badge text</Label>
                <Input
                  id="hero-badge"
                  value={settings.hero.badgeText}
                  maxLength={80}
                  disabled={saving}
                  onChange={(e) => patchHero("badgeText", e.target.value)}
                />
                <FieldCharCounter current={settings.hero.badgeText.length} max={80} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hero-logo-alt">Logo alt text</Label>
                <Input
                  id="hero-logo-alt"
                  value={settings.hero.logoAlt}
                  maxLength={120}
                  disabled={saving}
                  onChange={(e) => patchHero("logoAlt", e.target.value)}
                />
                <FieldCharCounter current={settings.hero.logoAlt.length} max={120} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hero-banner-alt">Banner alt text (SEO)</Label>
                <Input
                  id="hero-banner-alt"
                  value={settings.hero.bannerAlt}
                  maxLength={200}
                  disabled={saving}
                  placeholder="Optional — leave blank if decorative"
                  onChange={(e) => patchHero("bannerAlt", e.target.value)}
                />
                <FieldCharCounter current={settings.hero.bannerAlt.length} max={200} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hero-title">Title</Label>
                <Input
                  id="hero-title"
                  value={settings.hero.title}
                  maxLength={120}
                  disabled={saving}
                  onChange={(e) => patchHero("title", e.target.value)}
                />
                <FieldCharCounter current={settings.hero.title.length} max={120} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hero-highlight">Title highlight</Label>
                <Input
                  id="hero-highlight"
                  value={settings.hero.titleHighlight}
                  maxLength={120}
                  disabled={saving}
                  placeholder="Accent words after the title"
                  onChange={(e) => patchHero("titleHighlight", e.target.value)}
                />
                <FieldCharCounter current={settings.hero.titleHighlight.length} max={120} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="hero-subtitle">Subtitle</Label>
                <Textarea
                  id="hero-subtitle"
                  value={settings.hero.subtitle}
                  maxLength={600}
                  rows={3}
                  disabled={saving}
                  onChange={(e) => patchHero("subtitle", e.target.value)}
                />
                <FieldCharCounter current={settings.hero.subtitle.length} max={600} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="hero-search">Search placeholder</Label>
                <Input
                  id="hero-search"
                  value={settings.hero.searchPlaceholder}
                  maxLength={120}
                  disabled={saving}
                  onChange={(e) => patchHero("searchPlaceholder", e.target.value)}
                />
                <FieldCharCounter current={settings.hero.searchPlaceholder.length} max={120} />
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "sports" ? (
          <section className="space-y-5 rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
            <h2 className="text-base font-semibold text-foreground">Choose your sport</h2>
            <p className="text-sm text-cp-muted">
              Individual sport cards (name, image, modules) are managed in the Sports admin. This
              section only controls the introductory copy.
            </p>
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sports-badge">Badge / eyebrow</Label>
                <Input
                  id="sports-badge"
                  value={settings.sportsSection.badgeText}
                  maxLength={80}
                  disabled={saving}
                  onChange={(e) => patchSports("badgeText", e.target.value)}
                />
                <FieldCharCounter current={settings.sportsSection.badgeText.length} max={80} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sports-title">Title</Label>
                <Input
                  id="sports-title"
                  value={settings.sportsSection.title}
                  maxLength={120}
                  disabled={saving}
                  onChange={(e) => patchSports("title", e.target.value)}
                />
                <FieldCharCounter current={settings.sportsSection.title.length} max={120} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sports-subtitle">Subtitle</Label>
                <Textarea
                  id="sports-subtitle"
                  value={settings.sportsSection.subtitle}
                  maxLength={600}
                  rows={3}
                  disabled={saving}
                  onChange={(e) => patchSports("subtitle", e.target.value)}
                />
                <FieldCharCounter current={settings.sportsSection.subtitle.length} max={600} />
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-cp-border bg-cp-elevated/40 px-4 py-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-cp-border text-cp-primary"
                  checked={settings.sportsSection.includeLiveCount}
                  disabled={saving}
                  onChange={(e) => patchSports("includeLiveCount", e.target.checked)}
                />
                <span className="text-sm text-foreground">
                  Append live sport count
                  <span className="mt-0.5 block text-xs text-cp-muted">
                    Example: “2 sports live now — more rolling out soon.”
                  </span>
                </span>
              </label>
              <div className="space-y-1.5">
                <Label htmlFor="sports-empty">Empty state message</Label>
                <Textarea
                  id="sports-empty"
                  value={settings.sportsSection.emptyStateText}
                  maxLength={240}
                  rows={2}
                  disabled={saving}
                  onChange={(e) => patchSports("emptyStateText", e.target.value)}
                />
                <FieldCharCounter
                  current={settings.sportsSection.emptyStateText.length}
                  max={240}
                />
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === "footer" ? (
          <section className="space-y-6 rounded-2xl border border-cp-border bg-cp-card p-4 sm:p-6">
            <h2 className="text-base font-semibold text-foreground">Footer</h2>

            <SiteImageField
              kind="footer-logo"
              label="Footer logo"
              value={settings.footer.logoUrl}
              fallbackUrl={brandAssets.logo}
              pending={pendingImages["footer-logo"]}
              onPendingChange={(next) => setPending("footer-logo", next)}
              aspectClassName="aspect-[3/1] max-w-md"
              disabled={saving}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="footer-logo-alt">Logo alt text</Label>
                <Input
                  id="footer-logo-alt"
                  value={settings.footer.logoAlt}
                  maxLength={120}
                  disabled={saving}
                  onChange={(e) => patchFooter("logoAlt", e.target.value)}
                />
                <FieldCharCounter current={settings.footer.logoAlt.length} max={120} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="footer-company">Company name</Label>
                <Input
                  id="footer-company"
                  value={settings.footer.companyName}
                  maxLength={160}
                  disabled={saving}
                  onChange={(e) => patchFooter("companyName", e.target.value)}
                />
                <FieldCharCounter current={settings.footer.companyName.length} max={160} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="footer-email">Support email</Label>
                <Input
                  id="footer-email"
                  type="email"
                  value={settings.footer.supportEmail}
                  maxLength={160}
                  disabled={saving}
                  onChange={(e) => patchFooter("supportEmail", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="footer-copyright">Copyright suffix</Label>
                <Input
                  id="footer-copyright"
                  value={settings.footer.copyrightSuffix}
                  maxLength={160}
                  disabled={saving}
                  onChange={(e) => patchFooter("copyrightSuffix", e.target.value)}
                />
                <FieldCharCounter current={settings.footer.copyrightSuffix.length} max={160} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="footer-address">Address</Label>
                <Textarea
                  id="footer-address"
                  value={settings.footer.address}
                  maxLength={320}
                  rows={2}
                  disabled={saving}
                  onChange={(e) => patchFooter("address", e.target.value)}
                />
                <FieldCharCounter current={settings.footer.address.length} max={320} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <p className="text-xs text-cp-muted">
                Short brand blurb under the logo. Supports basic formatting.
              </p>
              <RichTextEditor
                value={coerceRichHtmlField(settings.footer.description) ?? settings.footer.description}
                onChange={(html) => patchFooter("description", html)}
                maxLength={2000}
                minHeight={120}
                placeholder="Describe Gud Game…"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="footer-site-title">Site column title</Label>
                <Input
                  id="footer-site-title"
                  value={settings.footer.siteColumnTitle}
                  maxLength={40}
                  disabled={saving}
                  onChange={(e) => patchFooter("siteColumnTitle", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="footer-legal-title">Legal column title</Label>
                <Input
                  id="footer-legal-title"
                  value={settings.footer.legalColumnTitle}
                  maxLength={40}
                  disabled={saving}
                  onChange={(e) => patchFooter("legalColumnTitle", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="footer-connect-title">Connect column title</Label>
                <Input
                  id="footer-connect-title"
                  value={settings.footer.connectColumnTitle}
                  maxLength={40}
                  disabled={saving}
                  onChange={(e) => patchFooter("connectColumnTitle", e.target.value)}
                />
              </div>
            </div>

            <FooterLinksEditor
              title="Site links"
              links={settings.footer.siteLinks}
              disabled={saving}
              onChange={(links) => patchFooter("siteLinks", links)}
            />
            <FooterLinksEditor
              title="Legal links"
              links={settings.footer.legalLinks}
              disabled={saving}
              onChange={(links) => patchFooter("legalLinks", links)}
            />
            <SocialLinksEditor
              links={settings.footer.socialLinks}
              disabled={saving}
              onChange={(links) => patchFooter("socialLinks", links)}
            />
          </section>
        ) : null}

        <div className="flex justify-end gap-2 border-t border-cp-border pt-4">
          <Button type="button" variant="outline" asChild>
            <a href="/" target="_blank" rel="noopener noreferrer">
              Preview site
            </a>
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving}>
            Save changes
          </Button>
        </div>
        </WorkspaceTabs>
      </div>
    </AdminShell>
  );
}
