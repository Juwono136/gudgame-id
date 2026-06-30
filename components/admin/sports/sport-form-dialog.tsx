"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LimitedTextarea } from "@/components/admin/form/limited-textarea";
import { RichTextEditor } from "@/components/admin/wiki/rich-text-editor";
import { SportHeroImageField } from "@/components/admin/sports/sport-hero-image-field";
import { SportCatalogNameSelect } from "@/components/admin/sports/sport-catalog-name-select";
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
import { DEFAULT_SPORT_MODULES, SPORT_VISIBILITY } from "@/lib/domain/sports";
import { SPORT_FIELD_LIMITS } from "@/lib/sports/field-limits";
import {
  validateSportFormInput,
  type SportFormFieldErrors,
} from "@/lib/sports/validate-sport-form";
import type { SportDetail } from "@/lib/sports/service";
import { coerceRichHtmlField } from "@/lib/wiki/sanitize-rich-text";
import {
  cpSelectContentClass,
  cpSelectItemClass,
  cpSelectTriggerClass,
} from "@/lib/styles/surface-classes";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { slugifyWikiName } from "@/lib/wiki/slug";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type SportFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sport?: SportDetail | null;
  onSubmit: (formData: FormData) => Promise<void>;
  onDelete?: (sport: SportDetail) => Promise<void>;
  isPending?: boolean;
  isDeleting?: boolean;
};

const VISIBILITY_LABELS = {
  live: "Live — visible & accessible",
  coming_soon: "Coming soon — listed on homepage",
  hidden: "Hidden — admin only",
} as const;

const MODULE_LABELS: Record<keyof typeof DEFAULT_SPORT_MODULES, string> = {
  tournaments: "Tournaments",
  players: "Players",
  gear: "Gear",
  rankings: "Rankings",
  rules: "Rules",
};

export function SportFormDialog({
  open,
  onOpenChange,
  sport,
  onSubmit,
  onDelete,
  isPending,
  isDeleting,
}: SportFormDialogProps) {
  const { confirm } = useConfirmDialog();
  const isEdit = Boolean(sport);

  const [name, setName] = useState("");
  const [catalogSlug, setCatalogSlug] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] =
    useState<(typeof SPORT_VISIBILITY)[number]>("coming_soon");
  const [isActive, setIsActive] = useState(true);
  const [rulesSummary, setRulesSummary] = useState("");
  const [modules, setModules] = useState(DEFAULT_SPORT_MODULES);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [clearHero, setClearHero] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<SportFormFieldErrors>({});

  const editorKey = `${sport?.id ?? "new"}-${open ? "open" : "closed"}`;

  useEffect(() => {
    if (!open) return;
    setHeroFile(null);
    setClearHero(false);
    setFieldErrors({});
    if (sport) {
      setName(sport.name);
      setCatalogSlug(sport.slug);
      setTagline(sport.tagline ?? "");
      setDescription(sport.description ?? "");
      setVisibility(sport.visibility as (typeof SPORT_VISIBILITY)[number]);
      setIsActive(sport.isActive);
      setRulesSummary(coerceRichHtmlField(sport.rulesSummary) ?? "");
      setModules(sport.modules ?? DEFAULT_SPORT_MODULES);
    } else {
      setName("");
      setCatalogSlug("");
      setTagline("");
      setDescription("");
      setVisibility("coming_soon");
      setIsActive(true);
      setRulesSummary("");
      setModules(DEFAULT_SPORT_MODULES);
    }
  }, [open, sport]);

  const autoSlug = useMemo(
    () => sport?.slug ?? (catalogSlug || slugifyWikiName(name) || "sport-slug"),
    [sport?.slug, catalogSlug, name],
  );

  const buildFormData = () => {
    const fd = new FormData();
    fd.set("name", name.trim());
    fd.set("slug", autoSlug);
    fd.set("tagline", tagline.trim());
    fd.set("description", description.trim());
    fd.set("visibility", visibility);
    fd.set("isActive", String(isActive));
    fd.set("rulesSummary", rulesSummary);
    fd.set("modules", JSON.stringify(modules));
    if (heroFile) fd.set("heroImage", heroFile);
    if (clearHero) fd.set("clearHeroImage", "true");
    return fd;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEdit && !catalogSlug) {
      setFieldErrors({ name: "Select a sport discipline from the catalog." });
      toast.error("Please select a sport discipline");
      return;
    }

    const validation = validateSportFormInput({
      name,
      tagline,
      description,
      rulesSummary,
    });
    setFieldErrors(validation.errors);

    if (!validation.ok) {
      const firstError = Object.values(validation.errors)[0];
      toast.error("Please fix the form", {
        description: firstError ?? "Some fields are invalid.",
      });
      return;
    }

    const ok = await confirm({
      title: isEdit ? "Save sport changes?" : "Create sport?",
      description: isEdit
        ? `Update "${name.trim()}" and publish changes to the homepage and public wiki.`
        : `Create "${name.trim()}" as a new sport discipline.`,
      confirmLabel: isEdit ? "Save changes" : "Create sport",
      cancelLabel: "Cancel",
    });
    if (!ok) return;

    await onSubmit(buildFormData());
  };

  const handleDelete = async () => {
    if (!sport || !onDelete) return;
    const ok = await confirm({
      title: "Permanently delete sport?",
      description: `"${sport.name}" will be removed from the database. This cannot be undone. Sports with wiki entries or tournaments cannot be deleted until that data is removed.`,
      confirmLabel: "Delete permanently",
      cancelLabel: "Cancel",
      variant: "destructive",
    });
    if (!ok) return;
    await onDelete(sport);
  };

  const busy = isPending || isDeleting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(94vh,920px)] w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden border-cp-border bg-cp-card p-0",
          "text-foreground shadow-2xl sm:max-w-5xl",
        )}
      >
        <DialogHeader className="shrink-0 border-b border-cp-border px-4 py-4 sm:px-6 sm:py-5">
          <DialogTitle>{isEdit ? "Edit sport" : "Add sport"}</DialogTitle>
          <DialogDescription>
            Configure how this discipline appears on the homepage and public wiki.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">
                  Identity
                </p>
                <div className="space-y-2">
                  {isEdit ? (
                    <>
                      <Label htmlFor="sport-name">Sport discipline</Label>
                      <Input
                        id="sport-name"
                        value={name}
                        disabled
                        readOnly
                        className="h-11 w-full border-cp-border bg-cp-elevated/80 text-foreground"
                      />
                      <p className="text-[11px] text-cp-muted">
                        Catalog discipline cannot be renamed after provisioning.
                      </p>
                    </>
                  ) : (
                    <SportCatalogNameSelect
                      value={catalogSlug}
                      onChange={(slug, catalogName) => {
                        setCatalogSlug(slug);
                        setName(catalogName);
                        if (fieldErrors.name) {
                          setFieldErrors((prev) => ({ ...prev, name: undefined }));
                        }
                      }}
                      disabled={busy}
                      error={fieldErrors.name}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sport-slug">URL slug</Label>
                  <Input
                    id="sport-slug"
                    value={autoSlug}
                    disabled
                    readOnly
                    className="h-11 w-full border-cp-border bg-cp-elevated/80 text-cp-muted"
                  />
                  <p className="text-[11px] text-cp-muted">
                    Fixed catalog slug shared with player sport interests.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <Select
                    value={visibility}
                    onValueChange={(v) =>
                      setVisibility(v as (typeof SPORT_VISIBILITY)[number])
                    }
                  >
                    <SelectTrigger className={cn(cpSelectTriggerClass, "h-11 w-full")}>
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      className={cn(cpSelectContentClass, "z-[400]")}
                      sideOffset={4}
                    >
                      {SPORT_VISIBILITY.map((v) => (
                        <SelectItem key={v} value={v} className={cpSelectItemClass}>
                          {VISIBILITY_LABELS[v]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="sport-tagline">Tagline</Label>
                    <FieldCharCounter
                      current={tagline.length}
                      max={SPORT_FIELD_LIMITS.tagline}
                    />
                  </div>
                  <Input
                    id="sport-tagline"
                    value={tagline}
                    maxLength={SPORT_FIELD_LIMITS.tagline}
                    onChange={(e) => {
                      setTagline(e.target.value.slice(0, SPORT_FIELD_LIMITS.tagline));
                      if (fieldErrors.tagline) {
                        setFieldErrors((prev) => ({ ...prev, tagline: undefined }));
                      }
                    }}
                    placeholder="Short line for cards and hero"
                    aria-invalid={Boolean(fieldErrors.tagline) || undefined}
                    className="h-11 w-full border-cp-border bg-cp-bg-input text-foreground"
                  />
                  {fieldErrors.tagline ? (
                    <p className="text-xs text-red-400">{fieldErrors.tagline}</p>
                  ) : (
                    <p className="text-xs text-cp-muted">
                      Shown on homepage cards and the sport hub hero.
                    </p>
                  )}
                </div>
                <LimitedTextarea
                  id="sport-desc"
                  label="Description"
                  value={description}
                  onChange={(next) => {
                    setDescription(next);
                    if (fieldErrors.description) {
                      setFieldErrors((prev) => ({ ...prev, description: undefined }));
                    }
                  }}
                  maxLength={SPORT_FIELD_LIMITS.description}
                  rows={5}
                  placeholder="Overview shown on homepage and sport hub"
                  hint="Plain text summary for discovery pages."
                  error={fieldErrors.description}
                />
                <SportHeroImageField
                  existingUrl={sport?.heroImageUrl}
                  onFileChange={setHeroFile}
                  onClear={() => setClearHero(true)}
                  cleared={clearHero}
                />
              </div>

              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-cp-muted">
                  Public modules & rules
                </p>
                <div className="space-y-3 rounded-xl border border-cp-border bg-cp-elevated/30 p-4">
                  <p className="text-xs font-medium text-cp-muted">Enabled sections</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(Object.keys(modules) as (keyof typeof modules)[]).map((key) => (
                      <label
                        key={key}
                        className="flex cursor-pointer items-center gap-3 rounded-lg border border-cp-border/80 bg-cp-card/60 px-3 py-2.5 transition-colors hover:border-cp-primary/30"
                      >
                        <input
                          type="checkbox"
                          checked={modules[key]}
                          onChange={(e) =>
                            setModules((prev) => ({ ...prev, [key]: e.target.checked }))
                          }
                          className="h-4 w-4 shrink-0 rounded border-cp-border accent-cp-primary"
                        />
                        <span className="text-sm font-medium text-foreground">
                          {MODULE_LABELS[key]}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>General rules</Label>
                  <p className="text-xs text-cp-muted">
                    Sport-wide rules shown on the public rules page. Use lists, bold, and links
                    for clarity.
                  </p>
                  <RichTextEditor
                    key={editorKey}
                    value={rulesSummary}
                    onChange={(next) => {
                      setRulesSummary(next);
                      if (fieldErrors.rulesSummary) {
                        setFieldErrors((prev) => ({ ...prev, rulesSummary: undefined }));
                      }
                    }}
                    placeholder="Describe scoring, court dimensions, equipment standards…"
                    minHeight={220}
                    maxLength={SPORT_FIELD_LIMITS.rulesSummary}
                    className="border-cp-border bg-cp-bg-input"
                  />
                  {fieldErrors.rulesSummary ? (
                    <p className="text-xs text-red-400">{fieldErrors.rulesSummary}</p>
                  ) : null}
                </div>

                <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-cp-border bg-cp-elevated/30 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Active</p>
                    <p className="text-xs text-cp-muted">
                      Inactive sports are hidden from admin sport selector
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 shrink-0 rounded border-cp-border accent-cp-primary"
                  />
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 flex-col gap-2 border-t border-cp-border bg-cp-elevated/30 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              {isEdit && onDelete ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void handleDelete()}
                  className="w-full border-red-500/40 text-red-500 hover:bg-red-500/10 hover:text-red-600 sm:w-auto"
                >
                  {isDeleting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete sport
                </Button>
              ) : (
                <span className="hidden sm:block" />
              )}
            </div>
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                className="w-full border-cp-border text-foreground hover:bg-cp-elevated sm:w-auto"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={busy}
                className="w-full bg-cp-primary hover:bg-cp-primary-light sm:w-auto"
              >
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isEdit ? "Save changes" : "Create sport"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
