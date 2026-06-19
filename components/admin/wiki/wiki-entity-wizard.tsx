"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import type { WikiEntityType } from "@/lib/domain/wiki";
import { adminRoutes } from "@/lib/constants/routes";
import {
  getEntityWizardConfig,
  type GearEntryMode,
  type WikiWizardStepId,
} from "@/lib/wiki/entity-config";
import {
  getWikiFieldDefinitions,
  partitionFieldValues,
  mergeFieldValues,
} from "@/lib/wiki/field-definitions";
import { slugifyWikiName } from "@/lib/wiki/slug";
import {
  scrapePreviewToFieldValues,
  scrapePreviewToGearProduct,
} from "@/lib/wiki/apply-scrape-preview";
import type { WikiEntityDetail } from "@/lib/wiki/service";
import type { WikiEntityUpsertInput } from "@/lib/validations/wiki-entities";
import type { WikiScrapePreview } from "@/lib/wiki/scrapers/types";
import {
  useCreateWikiEntity,
  useUpdateWikiEntity,
} from "@/hooks/use-wiki-entities";
import { WIKI_ENTITY_TYPE_LABELS } from "@/lib/wiki/constants";
import { DynamicFieldGrid } from "@/components/admin/wiki/dynamic-field-grid";
import { WikiStepper } from "@/components/admin/wiki/wiki-stepper";
import { GearCatalogImport } from "@/components/admin/wiki/gear-catalog-import";
import { PlayerProfileStep } from "@/components/admin/wiki/steps/player-profile-step";
import { TeamProfileStep } from "@/components/admin/wiki/steps/team-profile-step";
import { GearProductStep } from "@/components/admin/wiki/steps/gear-product-step";
import { MediaStatusPanel } from "@/components/admin/wiki/steps/media-status-panel";
import {
  GalleryUploadField,
  type GallerySlot,
} from "@/components/admin/wiki/gallery-upload-field";
import {
  WikiRelationPicker,
  type RelationDraft,
} from "@/components/admin/wiki/wiki-relation-picker";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/providers/confirm-dialog-provider";
import { cn } from "@/lib/utils";
import {
  equipmentFromAttributes,
  mergeEquipmentIntoAttributes,
  type PlayerEquipmentItem,
} from "@/lib/wiki/player-equipment";
import {
  mergePlayerEditableAttributes,
  parsePlayerEditableAttributes,
  type PlayerSocialLink,
} from "@/lib/wiki/player-profile-fields";
import { PLAYER_GALLERY_MAX } from "@/lib/wiki/constants";

type WikiEntityWizardProps = {
  sportSlug: string;
  mode: "create" | "edit";
  entityId?: string;
  initial?: WikiEntityDetail;
  initialEntityType?: WikiEntityType;
  skipClassification?: boolean;
  onBackToClassification?: () => void;
};

export function WikiEntityWizard({
  sportSlug,
  mode,
  entityId,
  initial,
  initialEntityType,
  skipClassification = false,
  onBackToClassification,
}: WikiEntityWizardProps) {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const createMutation = useCreateWikiEntity();
  const updateMutation = useUpdateWikiEntity(entityId ?? "");

  const [entityType, setEntityType] = useState<WikiEntityType>(
    initial?.entityType ?? initialEntityType ?? "player",
  );
  const [stepIndex, setStepIndex] = useState(skipClassification ? 1 : 0);
  const [gearMode, setGearMode] = useState<GearEntryMode>("manual");

  const config = useMemo(() => getEntityWizardConfig(entityType), [entityType]);
  const visibleSteps = useMemo(
    () =>
      skipClassification
        ? config.steps.filter((s) => s.id !== "classification")
        : config.steps,
    [config.steps, skipClassification],
  );
  const visibleStepIds = useMemo(
    () =>
      skipClassification
        ? config.stepIds.filter((id) => id !== "classification")
        : config.stepIds,
    [config.stepIds, skipClassification],
  );
  const currentStepId = visibleStepIds[stepIndex] as WikiWizardStepId | undefined;

  const fieldDefs = useMemo(
    () => getWikiFieldDefinitions(sportSlug, entityType),
    [sportSlug, entityType],
  );

  const [displayName, setDisplayName] = useState(initial?.displayName ?? "");
  const [nickname, setNickname] = useState(initial?.nickname ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [biography, setBiography] = useState(initial?.biography ?? "");
  const initialPlayerEditable =
    initial?.entityType === "player"
      ? parsePlayerEditableAttributes(initial.attributes)
      : null;
  const [playerNationality, setPlayerNationality] = useState(
    initialPlayerEditable?.nationality ?? "",
  );
  const [playerAge, setPlayerAge] = useState(
    initialPlayerEditable?.age?.toString() ?? "",
  );
  const [playerSocialLinks, setPlayerSocialLinks] = useState<PlayerSocialLink[]>(
    initialPlayerEditable?.socialLinks ?? [],
  );
  const [playerEquipment, setPlayerEquipment] = useState<PlayerEquipmentItem[]>(
    initial?.entityType === "player" ? equipmentFromAttributes(initial.attributes) : [],
  );
  const [signatureGearId, setSignatureGearId] = useState<string | null>(
    initialPlayerEditable?.signatureGearId ?? null,
  );
  const [playerEquipmentPreviews, setPlayerEquipmentPreviews] = useState<
    Record<string, string>
  >({});
  const [playerEquipmentFiles, setPlayerEquipmentFiles] = useState<
    Record<string, File>
  >({});
  const [teamFormat, setTeamFormat] = useState(
    String(initial?.attributes?.teamFormat ?? ""),
  );

  const [gearProduct, setGearProduct] = useState(() =>
    initial?.entityType === "gear"
      ? {
          displayName: initial.displayName,
          slug: initial.slug,
          summary: initial.summary ?? "",
          brand: String(initial.attributes.brand ?? ""),
          model: String(initial.attributes.model ?? ""),
          gearCategory: String(initial.attributes.gearCategory ?? ""),
          price: String(initial.attributes.price ?? ""),
        }
      : {
          displayName: "",
          slug: "",
          summary: "",
          brand: "",
          model: "",
          gearCategory: "racket",
          price: "",
        },
  );

  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>(() =>
    initial
      ? mergeFieldValues(getWikiFieldDefinitions(sportSlug, initial.entityType as WikiEntityType), {
          attributes: initial.attributes,
          performance: initial.performance,
          specs: initial.specs,
        })
      : {},
  );

  const [status, setStatus] = useState<WikiEntityUpsertInput["status"]>(
    initial?.status ?? "draft",
  );
  const [sourceType, setSourceType] = useState<"manual" | "scraped">(
    (initial?.sourceType as "manual" | "scraped") ?? "manual",
  );
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? "");
  const [features, setFeatures] = useState(initial?.features ?? []);
  const [heroPreview, setHeroPreview] = useState(initial?.heroImageUrl ?? "");
  const [primaryPreview, setPrimaryPreview] = useState(initial?.primaryImageUrl ?? "");
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [primaryFile, setPrimaryFile] = useState<File | null>(null);
  const [gallerySlots, setGallerySlots] = useState<GallerySlot[]>(() =>
    (initial?.gallery ?? []).map((g) => ({
      id: `existing-${g.id}`,
      preview: g.url ?? "",
      existingUrl: g.url ?? undefined,
    })),
  );
  const [relations, setRelations] = useState<RelationDraft[]>(() =>
    (initial?.relations ?? []).map((r) => ({
      toEntityId: r.entity.id,
      relationType: r.relationType,
      displayName: r.entity.displayName,
      entityType: r.entity.entityType,
      primaryImageUrl: r.entity.primaryImageUrl,
      sortOrder: r.sortOrder,
    })),
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mode === "edit") return;
    setStepIndex(0);
    setFieldValues({});
  }, [entityType, mode]);

  const applyGearScrape = useCallback(
    (preview: WikiScrapePreview) => {
      setGearProduct(scrapePreviewToGearProduct(preview));
      setFieldValues(scrapePreviewToFieldValues(sportSlug, preview));
      setPrimaryPreview(preview.primaryImageUrl ?? "");
      setSourceUrl(preview.sourceUrl);
      setSourceType("scraped");
      setGearMode("manual");
      const productStep = getEntityWizardConfig("gear").stepIds.indexOf("product");
      if (productStep >= 0) setStepIndex(productStep);
    },
    [sportSlug],
  );

  const buildPayload = (): WikiEntityUpsertInput => {
    if (entityType === "gear") {
      const extra = partitionFieldValues(fieldDefs, fieldValues);
      return {
        entityType: "gear",
        displayName: gearProduct.displayName.trim(),
        slug: gearProduct.slug.trim() || slugifyWikiName(gearProduct.displayName),
        summary: gearProduct.summary.trim() || undefined,
        biography: undefined,
        status,
        attributes: {
          ...extra.attributes,
          brand: gearProduct.brand,
          model: gearProduct.model,
          gearCategory: gearProduct.gearCategory,
          price: gearProduct.price,
        },
        performance: extra.performance,
        specs: extra.specs,
        features,
        sourceType,
        sourceUrl: sourceUrl.trim() || undefined,
        relations: relations.map((r) => ({
          toEntityId: r.toEntityId,
          relationType: r.relationType,
          sortOrder: r.sortOrder,
        })),
        gallery: gallerySlots
          .filter((s) => s.existingUrl && !s.file)
          .map((s, i) => ({ url: s.existingUrl, sortOrder: i })),
        heroImageUrl: heroPreview || undefined,
        primaryImageUrl: primaryPreview || undefined,
      };
    }

    const partitioned = partitionFieldValues(fieldDefs, fieldValues);
    let attrs =
      entityType === "team"
        ? { ...partitioned.attributes, teamFormat }
        : partitioned.attributes;

    if (entityType === "player") {
      attrs = mergePlayerEditableAttributes(
        mergeEquipmentIntoAttributes(attrs, playerEquipment),
        {
          nationality: playerNationality,
          age: playerAge.trim() ? Number(playerAge) : null,
          socialLinks: playerSocialLinks,
          signatureGearId,
        },
      );
    }

    return {
      entityType,
      displayName: displayName.trim(),
      nickname: nickname.trim() || undefined,
      slug: slug.trim() || slugifyWikiName(displayName),
      summary: summary.trim() || undefined,
      biography: biography.trim() || undefined,
      status,
      attributes: attrs,
      performance: partitioned.performance,
      specs: partitioned.specs,
      features,
      sourceType,
      sourceUrl: sourceUrl.trim() || undefined,
      relations: relations.map((r) => ({
        toEntityId: r.toEntityId,
        relationType: r.relationType,
        sortOrder: r.sortOrder,
      })),
      gallery: gallerySlots
        .filter((s) => s.existingUrl && !s.file)
        .map((s, i) => ({ url: s.existingUrl, sortOrder: i })),
      heroImageUrl: heroPreview || undefined,
      primaryImageUrl: primaryPreview || undefined,
    };
  };

  const validateStep = (): boolean => {
    setFieldErrors({});
    if (currentStepId === "profile" || currentStepId === "product") {
      if (entityType === "gear") {
        const errs: Record<string, string> = {};
        if (!gearProduct.displayName.trim()) errs.displayName = "Product name is required";
        if (!gearProduct.brand.trim()) errs.brand = "Brand is required";
        if (Object.keys(errs).length) {
          toast.error("Please complete required product fields");
          return false;
        }
      } else {
        if (!displayName.trim()) {
          setFieldErrors({ displayName: "Name is required" });
          toast.error("Name is required");
          return false;
        }
        const slugVal = slug.trim() || slugifyWikiName(displayName);
        if (slugVal && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugVal)) {
          setFieldErrors({ slug: "Use lowercase letters, numbers, and hyphens only" });
          toast.error("Invalid URL slug");
          return false;
        }
      }
    }
    if (currentStepId === "source" && entityType === "gear" && gearMode === "catalog") {
      toast.info("Use “Scan page” to load products, import as drafts, or switch to manual entry");
      return false;
    }
    if (currentStepId === "source" && entityType === "gear" && gearMode === "manual") {
      return true;
    }
    return true;
  };

  const save = async (publish?: boolean) => {
    const payload = buildPayload();
    if (publish) payload.status = "published";

    const confirmed = await confirm({
      title: publish ? "Publish this entity?" : "Save wiki entity?",
      description: publish
        ? "Published entries appear on the public sport wiki."
        : "Drafts remain in the admin console only.",
      confirmLabel: publish ? "Publish" : "Save",
      cancelLabel: "Cancel",
    });
    if (!confirmed) return;

    const files = {
      heroImage: heroFile,
      primaryImage: primaryFile,
      gallerySlots,
      equipmentFiles: entityType === "player" ? playerEquipmentFiles : undefined,
    };
    if (mode === "create") {
      createMutation.mutate({ data: payload, files });
    } else {
      updateMutation.mutate({ data: payload, files });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const performanceFields = fieldDefs.filter((f) =>
    ["performance", "biodata", "attributes"].includes(f.group),
  );
  const specsFields = fieldDefs.filter((f) =>
    ["specs", "performance", "gear"].includes(f.group),
  );

  return (
    <div className="mx-auto max-w-6xl">
      <WikiStepper steps={visibleSteps} currentIndex={stepIndex} />

      <AnimatePresence mode="wait">
        <motion.div
          key={`${entityType}-${stepIndex}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {currentStepId === "classification" ? (
            <section className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Select entity classification
                </h2>
                <p className="mt-1 text-sm text-cp-muted">
                  Each type uses a <strong className="text-slate-300">different form</strong>{" "}
                  tailored to players, tournaments, or gear for{" "}
                  <span className="text-cp-logo-accent">{sportSlug}</span>.
                </p>
              </div>
              <div className="rounded-xl border border-cp-border bg-cp-card px-5 py-4">
                <p className="text-sm font-semibold text-foreground">
                  {WIKI_ENTITY_TYPE_LABELS[entityType]}
                </p>
                <p className="mt-1 text-xs text-cp-muted">
                  Entity type cannot be changed after creation.
                </p>
              </div>
            </section>
          ) : null}

          {currentStepId === "source" && entityType === "gear" ? (
            <section className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <ModeChip
                  active={gearMode === "manual"}
                  label="Manual entry"
                  onClick={() => setGearMode("manual")}
                />
                <ModeChip
                  active={gearMode === "catalog"}
                  label="Import from website"
                  onClick={() => setGearMode("catalog")}
                />
              </div>
              {gearMode === "catalog" ? (
                <GearCatalogImport
                  sportSlug={sportSlug}
                  onSelectSingle={applyGearScrape}
                  onBulkDone={() => router.push(adminRoutes.wikiEntities)}
                />
              ) : (
                <p className="rounded-lg border border-cp-border bg-cp-card p-4 text-sm text-cp-muted">
                  Continue to enter product details manually in the next steps.
                </p>
              )}
            </section>
          ) : null}

          {currentStepId === "profile" && entityType === "player" ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <h2 className="mb-4 text-lg font-semibold text-foreground">Player profile</h2>
                <PlayerProfileStep
                  values={{
                    displayName,
                    nickname,
                    slug,
                    summary,
                    biography,
                    nationality: playerNationality,
                    age: playerAge,
                    socialLinks: playerSocialLinks,
                    equipment: playerEquipment,
                    signatureGearId,
                  }}
                  errors={fieldErrors}
                  equipmentPreviews={playerEquipmentPreviews}
                  onEquipmentImageChange={(id, file) => {
                    if (playerEquipmentPreviews[id]) {
                      URL.revokeObjectURL(playerEquipmentPreviews[id]!);
                    }
                    if (!file) {
                      setPlayerEquipmentFiles((prev) => {
                        const next = { ...prev };
                        delete next[id];
                        return next;
                      });
                      setPlayerEquipmentPreviews((prev) => {
                        const next = { ...prev };
                        delete next[id];
                        return next;
                      });
                      return;
                    }
                    setPlayerEquipmentFiles((prev) => ({ ...prev, [id]: file }));
                    setPlayerEquipmentPreviews((prev) => ({
                      ...prev,
                      [id]: URL.createObjectURL(file),
                    }));
                  }}
                  onChange={(p) => {
                    if (p.displayName !== undefined) setDisplayName(p.displayName);
                    if (p.nickname !== undefined) setNickname(p.nickname);
                    if (p.slug !== undefined) setSlug(p.slug);
                    if (p.summary !== undefined) setSummary(p.summary);
                    if (p.biography !== undefined) setBiography(p.biography);
                    if (p.nationality !== undefined) setPlayerNationality(p.nationality);
                    if (p.age !== undefined) setPlayerAge(p.age);
                    if (p.socialLinks !== undefined) setPlayerSocialLinks(p.socialLinks);
                    if (p.equipment !== undefined) setPlayerEquipment(p.equipment);
                    if (p.signatureGearId !== undefined) setSignatureGearId(p.signatureGearId);
                  }}
                />
                <div className="mt-6">
                  <GalleryUploadField
                    slots={gallerySlots}
                    onChange={setGallerySlots}
                    label="Photo gallery"
                    hint={`Up to ${PLAYER_GALLERY_MAX} photos on the public player page.`}
                    maxImages={PLAYER_GALLERY_MAX}
                  />
                </div>
              </div>
              <MediaStatusPanel
                status={status}
                onStatusChange={setStatus}
                primaryPreview={primaryPreview}
                heroPreview={heroPreview}
                onPrimaryFile={(f) => {
                  setPrimaryFile(f);
                  setPrimaryPreview(URL.createObjectURL(f));
                }}
                onPrimaryUrl={setPrimaryPreview}
                onHeroFile={(f) => {
                  setHeroFile(f);
                  setHeroPreview(URL.createObjectURL(f));
                }}
                onHeroUrl={setHeroPreview}
                primaryLabel="Profile photo"
                showHero={false}
              />
            </div>
          ) : null}

          {currentStepId === "profile" && entityType === "team" ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <h2 className="mb-4 text-lg font-semibold text-foreground">Team profile</h2>
                <TeamProfileStep
                  values={{
                    displayName,
                    nickname,
                    slug,
                    summary,
                    biography,
                    teamFormat,
                  }}
                  errors={fieldErrors}
                  onChange={(p) => {
                    if (p.displayName !== undefined) setDisplayName(p.displayName);
                    if (p.nickname !== undefined) setNickname(p.nickname);
                    if (p.slug !== undefined) setSlug(p.slug);
                    if (p.summary !== undefined) setSummary(p.summary);
                    if (p.biography !== undefined) setBiography(p.biography);
                    if (p.teamFormat !== undefined) setTeamFormat(p.teamFormat);
                  }}
                />
                <div className="mt-6">
                  <GalleryUploadField
                    slots={gallerySlots}
                    onChange={setGallerySlots}
                    label="Team photos"
                    hint="Up to 5 images on the public team page."
                  />
                </div>
              </div>
              <MediaStatusPanel
                status={status}
                onStatusChange={setStatus}
                primaryPreview={primaryPreview}
                heroPreview={heroPreview}
                onPrimaryFile={(f) => {
                  setPrimaryFile(f);
                  setPrimaryPreview(URL.createObjectURL(f));
                }}
                onPrimaryUrl={setPrimaryPreview}
                onHeroFile={(f) => {
                  setHeroFile(f);
                  setHeroPreview(URL.createObjectURL(f));
                }}
                onHeroUrl={setHeroPreview}
                primaryLabel="Team logo / photo"
                heroLabel="Hero banner"
              />
            </div>
          ) : null}

          {currentStepId === "product" && entityType === "gear" ? (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <h2 className="mb-4 text-lg font-semibold text-foreground">Product details</h2>
                <GearProductStep
                  values={gearProduct}
                  scraped={sourceType === "scraped"}
                  onChange={(p) => setGearProduct((prev) => ({ ...prev, ...p }))}
                />
              </div>
              <MediaStatusPanel
                status={status}
                onStatusChange={setStatus}
                primaryPreview={primaryPreview}
                heroPreview={heroPreview}
                onPrimaryFile={(f) => {
                  setPrimaryFile(f);
                  setPrimaryPreview(URL.createObjectURL(f));
                }}
                onPrimaryUrl={setPrimaryPreview}
                onHeroFile={(f) => {
                  setHeroFile(f);
                  setHeroPreview(URL.createObjectURL(f));
                }}
                onHeroUrl={setHeroPreview}
                primaryLabel="Product image"
                showHero={false}
              />
            </div>
          ) : null}

          {currentStepId === "performance" && entityType === "team" ? (
            <section className="rounded-xl border border-cp-border bg-cp-card p-5">
              <h2 className="text-lg font-semibold text-foreground">Team performance</h2>
              <p className="mt-1 text-sm text-cp-muted">
                Season stats, win rate, and chemistry metrics.
              </p>
              <div className="mt-6">
                <DynamicFieldGrid
                  fields={performanceFields}
                  values={fieldValues}
                  onChange={(key, v) =>
                    setFieldValues((prev) => ({ ...prev, [key]: v }))
                  }
                />
              </div>
            </section>
          ) : null}

          {currentStepId === "specs" && entityType === "gear" ? (
            <section className="rounded-xl border border-cp-border bg-cp-card p-5">
              <h2 className="text-lg font-semibold text-foreground">Technical specs & ratings</h2>
              <p className="mt-1 text-sm text-cp-muted">
                Shape, weight, balance, and performance bars (power / control).
              </p>
              <div className="mt-6">
                <DynamicFieldGrid
                  fields={specsFields}
                  values={fieldValues}
                  onChange={(key, v) =>
                    setFieldValues((prev) => ({ ...prev, [key]: v }))
                  }
                />
              </div>
            </section>
          ) : null}

          {currentStepId === "roster" && entityType === "team" ? (
            <section className="rounded-xl border border-cp-border bg-cp-card p-5 sm:p-6">
              <WikiRelationPicker
                label="Team roster"
                hint="Link published player wiki entries to this team. They appear on the public team page as the duo / squad."
                relationType="team_member"
                targetTypes={["player"]}
                relations={relations}
                onChange={setRelations}
                excludeEntityId={entityId}
              />
            </section>
          ) : null}

          {currentStepId === "review" ? (
            <section className="rounded-xl border border-cp-primary/30 bg-cp-primary/5 p-6">
              <h2 className="text-lg font-semibold text-foreground">Review & save</h2>
              <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <Row label="Type" value={entityType} />
                <Row
                  label="Name"
                  value={
                    entityType === "gear" ? gearProduct.displayName : displayName
                  }
                />
                <Row
                  label="Slug"
                  value={
                    entityType === "gear"
                      ? gearProduct.slug || slugifyWikiName(gearProduct.displayName)
                      : slug || slugifyWikiName(displayName)
                  }
                />
                <Row label="Status" value={status} />
                <Row label="Source" value={sourceType} />
              </dl>
            </section>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <WizardFooter
        stepIndex={stepIndex}
        stepCount={visibleStepIds.length}
        isPending={isPending}
        backLabel={
          stepIndex === 0 && onBackToClassification ? "Change classification" : undefined
        }
        onBack={() => {
          if (stepIndex === 0 && onBackToClassification) {
            onBackToClassification();
            return;
          }
          setStepIndex((s) => Math.max(0, s - 1));
        }}
        onNext={() => {
          if (!validateStep()) return;
          setStepIndex((s) => Math.min(visibleStepIds.length - 1, s + 1));
        }}
        onSaveDraft={() => void save(false)}
        onPublish={() => void save(true)}
      />
    </div>
  );
}

function ModeChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "border-cp-primary bg-cp-primary/15 text-foreground"
          : "border-cp-border text-cp-muted hover:border-cp-primary/40",
      )}
    >
      {label}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-cp-muted">{label}</dt>
      <dd className="font-medium text-foreground">{value}</dd>
    </div>
  );
}

function WizardFooter({
  stepIndex,
  stepCount,
  isPending,
  backLabel,
  onBack,
  onNext,
  onSaveDraft,
  onPublish,
}: {
  stepIndex: number;
  stepCount: number;
  isPending: boolean;
  backLabel?: string;
  onBack: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
}) {
  const isLast = stepIndex >= stepCount - 1;

  return (
    <div className="mt-8 flex flex-col-reverse gap-3 border-t border-cp-border pt-6 sm:flex-row sm:items-center sm:justify-between">
      {backLabel && stepIndex === 0 ? (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center text-sm text-cp-muted hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          {backLabel}
        </button>
      ) : (
        <Link
          href={adminRoutes.wikiEntities}
          className="inline-flex items-center text-sm text-cp-muted hover:text-foreground"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to database
        </Link>
      )}
      <div className="flex flex-wrap gap-2">
        {stepIndex > 0 ? (
          <Button type="button" variant="outline" onClick={onBack} className="border-cp-border">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
        ) : null}
        {!isLast ? (
          <Button
            type="button"
            onClick={onNext}
            className="bg-cp-primary hover:bg-cp-primary-light"
          >
            Next
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={onSaveDraft}
              className="border-cp-border"
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save draft
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={onPublish}
              className="bg-cp-primary hover:bg-cp-primary-light"
            >
              Publish
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
