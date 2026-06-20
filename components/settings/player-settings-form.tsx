"use client";

import { useCallback, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Camera, ExternalLink, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/admin/wiki/rich-text-editor";
import { AuthField } from "@/components/auth/auth-field";
import { AuthInput } from "@/components/auth/auth-form-controls";
import { Button } from "@/components/ui/button";
import { SettingsSectionCard } from "@/components/settings/settings-section-card";
import { PlayerStatsReadonly } from "@/components/settings/player-stats-readonly";
import {
  PlayerEquipmentEditor,
  newEquipmentItem,
} from "@/components/settings/player-equipment-editor";
import { PlayerSocialLinksEditor } from "@/components/settings/player-social-links-editor";
import type { PlayerWikiProfileView } from "@/lib/account/player-profile/service";
import type { PlayerEquipmentItem } from "@/lib/wiki/player-equipment";
import type { PlayerSocialLink } from "@/lib/wiki/player-profile-fields";
import {
  PLAYER_AGE_MAX,
  PLAYER_AGE_MIN,
  PLAYER_NATIONALITY_MAX,
  PLAYER_SUMMARY_MAX,
} from "@/lib/wiki/player-profile-fields";
import { PLAYER_GALLERY_MAX } from "@/lib/wiki/constants";
import { useSavePlayerProfile } from "@/hooks/use-account-settings";
import { cn } from "@/lib/utils";

type GallerySlot = {
  url?: string | null;
  storageKey?: string | null;
  caption?: string;
  file?: File | null;
  preview?: string | null;
};

type PlayerSettingsFormProps = {
  profile: PlayerWikiProfileView | null;
  accountImageUrl?: string | null;
  accountFullName: string;
  onGoToProfile?: () => void;
};

export function PlayerSettingsForm({
  profile,
  accountImageUrl,
  accountFullName,
  onGoToProfile,
}: PlayerSettingsFormProps) {
  const mutation = useSavePlayerProfile();
  const isCreate = !profile;

  const [summary, setSummary] = useState(profile?.summary ?? "");
  const [biography, setBiography] = useState(profile?.biography ?? "");
  const [nationality, setNationality] = useState(profile?.nationality ?? "");
  const [age, setAge] = useState(profile?.age?.toString() ?? "");
  const [socialLinks, setSocialLinks] = useState<PlayerSocialLink[]>(
    profile?.socialLinks ?? [],
  );
  const [signatureGearId, setSignatureGearId] = useState<string | null>(
    profile?.signatureGearId ?? null,
  );
  const [equipment, setEquipment] = useState<PlayerEquipmentItem[]>(
    profile?.equipment?.length ? profile.equipment : [],
  );
  const [equipmentFiles, setEquipmentFiles] = useState<Record<string, File>>({});
  const [equipmentPreviews, setEquipmentPreviews] = useState<Record<string, string>>({});

  const [gallery, setGallery] = useState<GallerySlot[]>(
    profile?.gallery?.length
      ? profile.gallery.map((g) => ({ url: g.url, caption: g.caption ?? "" }))
      : [],
  );
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);

  const handleEquipmentImage = useCallback((id: string, file: File | null) => {
    if (equipmentPreviews[id]) URL.revokeObjectURL(equipmentPreviews[id]!);
    if (!file) {
      setEquipmentFiles((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setEquipmentPreviews((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }
    setEquipmentFiles((prev) => ({ ...prev, [id]: file }));
    setEquipmentPreviews((prev) => ({ ...prev, [id]: URL.createObjectURL(file) }));
  }, [equipmentPreviews]);

  const validEquipment = useMemo(
    () => equipment.filter((e) => (e.gearEntityId || e.name?.trim()) && (e.gearEntityId || e.name!.trim().length > 0)),
    [equipment],
  );

  const hasAccountFullName = accountFullName.trim().length >= 2;

  const onSubmit = async () => {
    if (!hasAccountFullName) {
      toast.error("Add your full name in the Profile section first");
      return;
    }

    const formData = new FormData();
    formData.set("summary", summary);
    formData.set("biography", biography);
    formData.set("nationality", nationality);
    formData.set("age", age);
    formData.set("socialLinks", JSON.stringify(socialLinks.filter((l) => l.url.trim())));
    formData.set("signatureGearId", signatureGearId ?? "");
    formData.set("equipment", JSON.stringify(validEquipment));
    formData.set(
      "gallery",
      JSON.stringify(
        gallery
          .filter((g) => g.url || g.storageKey)
          .map((g, i) => ({
            url: g.url ?? undefined,
            storageKey: g.storageKey ?? undefined,
            caption: g.caption,
            sortOrder: i,
          })),
      ),
    );

    for (const [id, file] of Object.entries(equipmentFiles)) {
      formData.set(`equipmentImage_${id}`, file);
    }
    for (const file of galleryFiles) {
      if (file) formData.append("galleryImages", file);
    }

    try {
      const result = await mutation.mutateAsync({ formData, create: isCreate });
      toast.success(result.message);
      setEquipmentFiles({});
      setGalleryFiles([]);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <SettingsSectionCard
        id="player-profile"
        title="Player page"
        description="Public wiki profile. Profile photo uses your account photo from the Profile section above."
        action={
          profile ? (
            <Link
              href={profile.publicUrl}
              target="_blank"
              className="inline-flex items-center gap-1 text-sm font-semibold text-cp-primary hover:underline"
            >
              View public page
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ) : null
        }
      >
        {isCreate ? (
          <p className="mb-5 rounded-xl border border-cp-primary/30 bg-cp-primary/5 p-4 text-sm text-cp-muted">
            Create your player profile to appear in the public directory. Tournament stats and
            years active are calculated automatically when you compete.
          </p>
        ) : null}

        {!hasAccountFullName ? (
          <p className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200/90">
            Your public player name comes from your account full name. Complete your{" "}
            <button
              type="button"
              onClick={onGoToProfile}
              className="font-medium text-cp-primary hover:underline"
            >
              Profile
            </button>{" "}
            before creating or saving your player page.
          </p>
        ) : (
          <div className="mb-5 rounded-xl border border-cp-border bg-cp-elevated/30 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-cp-muted">
              Public player name
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">{accountFullName}</p>
            <p className="mt-1 text-xs text-cp-text-dim">
              Synced from your account full name. Update it in the{" "}
              <button
                type="button"
                onClick={onGoToProfile}
                className="font-medium text-cp-primary hover:underline"
              >
                Profile
              </button>{" "}
              tab.
            </p>
          </div>
        )}

        {accountImageUrl ? (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-cp-border bg-cp-elevated/30 p-4 sm:flex-row sm:items-center">
            <div className="relative mx-auto h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-cp-border sm:mx-0">
              <Image src={accountImageUrl} alt="" fill className="object-cover" unoptimized />
            </div>
            <p className="text-center text-sm text-cp-muted sm:text-left">
              Public player photo is synced from your account profile. Update it in the{" "}
              <button
                type="button"
                onClick={onGoToProfile}
                className="font-medium text-cp-primary hover:underline"
              >
                Profile
              </button>{" "}
              tab.
            </p>
          </div>
        ) : null}

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
            <AuthField label="Nationality" htmlFor="nationality">
              <AuthInput
                id="nationality"
                value={nationality}
                maxLength={PLAYER_NATIONALITY_MAX}
                onChange={(e) => setNationality(e.target.value)}
                placeholder="e.g. Indonesia (INA)"
              />
            </AuthField>
            <AuthField label="Age" htmlFor="age">
              <AuthInput
                id="age"
                type="number"
                min={PLAYER_AGE_MIN}
                max={PLAYER_AGE_MAX}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder={`${PLAYER_AGE_MIN}–${PLAYER_AGE_MAX}`}
                className="max-w-[120px]"
              />
            </AuthField>
          </div>

          {profile?.yearsActive ? (
            <div className="rounded-xl border border-cp-border bg-cp-elevated/30 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-cp-muted">
                Years active
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">{profile.yearsActive}</p>
              <p className="mt-1 text-xs text-cp-text-dim">
                Calculated from tournament participation. Updates automatically after matches.
              </p>
            </div>
          ) : null}

          <AuthField label="Short tagline" htmlFor="summary">
            <AuthInput
              id="summary"
              value={summary}
              maxLength={PLAYER_SUMMARY_MAX}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. Aggressive left-side player"
            />
          </AuthField>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Biography</label>
            <RichTextEditor
              value={biography}
              onChange={setBiography}
              placeholder="Career history, playing style, achievements…"
              minHeight={180}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Social media</label>
            <PlayerSocialLinksEditor links={socialLinks} onChange={setSocialLinks} />
          </div>
        </div>
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Career statistics"
        description="Read-only data from official tournament results."
      >
        <PlayerStatsReadonly profile={profile} />
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Equipment"
        description="Gear you use in competition. Mark one item as your signature gear for the public page."
      >
        <PlayerEquipmentEditor
          sportSlug={profile?.sportSlug ?? "padel"}
          items={equipment}
          onChange={setEquipment}
          equipmentPreviews={equipmentPreviews}
          onImageChange={handleEquipmentImage}
          signatureGearId={signatureGearId}
          onSignatureChange={setSignatureGearId}
        />
      </SettingsSectionCard>

      <SettingsSectionCard
        title="Photo gallery"
        description={`Up to ${PLAYER_GALLERY_MAX} images on your public player page.`}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {gallery.map((slot, index) => {
            const src = slot.preview ?? slot.url ?? null;
            return (
              <div
                key={`gallery-${index}`}
                className="relative aspect-square overflow-hidden rounded-xl border border-cp-border bg-cp-elevated"
              >
                {src ? (
                  <Image src={src} alt="" fill className="object-cover" unoptimized />
                ) : (
                  <label className="flex h-full cursor-pointer flex-col items-center justify-center gap-2 p-2 text-center text-xs text-cp-muted hover:bg-cp-card">
                    <Camera className="h-5 w-5" />
                    Add photo
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        if (!file) return;
                        setGallery((prev) => {
                          const next = [...prev];
                          const s = next[index];
                          if (!s) return prev;
                          if (s.preview) URL.revokeObjectURL(s.preview);
                          next[index] = {
                            ...s,
                            file,
                            preview: URL.createObjectURL(file),
                            url: undefined,
                          };
                          return next;
                        });
                        setGalleryFiles((prev) => {
                          const next = [...prev];
                          next[index] = file;
                          return next;
                        });
                      }}
                    />
                  </label>
                )}
                <button
                  type="button"
                  className="absolute top-1.5 right-1.5 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                  onClick={() => {
                    setGallery((prev) => prev.filter((_, i) => i !== index));
                    setGalleryFiles((prev) => prev.filter((_, i) => i !== index));
                  }}
                  aria-label="Remove photo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}

          {gallery.length < PLAYER_GALLERY_MAX ? (
            <button
              type="button"
              onClick={() => setGallery((prev) => [...prev, {}])}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-cp-border text-xs text-cp-muted transition-colors hover:border-cp-primary/40 hover:bg-cp-primary/5 hover:text-cp-primary",
              )}
            >
              <Plus className="h-5 w-5" />
              Add slot
            </button>
          ) : null}
        </div>
      </SettingsSectionCard>

      <div className="sticky bottom-4 z-10 flex justify-end rounded-xl border border-cp-border/80 bg-cp-bg/90 p-3 backdrop-blur-md sm:static sm:border-0 sm:bg-transparent sm:p-0">
        <Button
          type="button"
          disabled={mutation.isPending || !hasAccountFullName}
          onClick={() => void onSubmit()}
          className="w-full min-w-[180px] rounded-lg bg-cp-primary font-semibold hover:bg-cp-primary-light sm:w-auto"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              {isCreate ? "Create player profile" : "Save player profile"}
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
