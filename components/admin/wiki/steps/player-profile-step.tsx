"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FieldCharCounter } from "@/components/tournaments/form/field-char-counter";
import { slugifyWikiName } from "@/lib/wiki/slug";
import { RichTextEditor } from "@/components/admin/wiki/rich-text-editor";
import { PlayerSocialLinksEditor } from "@/components/settings/player-social-links-editor";
import { PlayerEquipmentEditor } from "@/components/settings/player-equipment-editor";
import type { PlayerEquipmentItem } from "@/lib/wiki/player-equipment";
import type { PlayerSocialLink } from "@/lib/wiki/player-profile-fields";
import {
  PLAYER_AGE_MAX,
  PLAYER_AGE_MIN,
  PLAYER_BIOGRAPHY_MAX,
  PLAYER_DISPLAY_NAME_MAX,
  PLAYER_NATIONALITY_MAX,
  PLAYER_NICKNAME_MAX,
  PLAYER_SLUG_MAX,
  PLAYER_SUMMARY_MAX,
} from "@/lib/wiki/player-profile-fields";

export type PlayerProfileValues = {
  displayName: string;
  nickname: string;
  slug: string;
  summary: string;
  biography: string;
  nationality: string;
  age: string;
  socialLinks: PlayerSocialLink[];
  equipment: PlayerEquipmentItem[];
  signatureGearId: string | null;
};

type PlayerProfileStepProps = {
  sportSlug: string;
  values: PlayerProfileValues;
  onChange: (patch: Partial<PlayerProfileValues>) => void;
  errors?: Partial<Record<keyof PlayerProfileValues, string>>;
  equipmentPreviews: Record<string, string>;
  onEquipmentImageChange: (id: string, file: File | null) => void;
};

export function PlayerProfileStep({
  sportSlug,
  values,
  onChange,
  errors,
  equipmentPreviews,
  onEquipmentImageChange,
}: PlayerProfileStepProps) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <p className="text-sm leading-relaxed text-cp-muted">
        Editorial athlete profile for the public player wiki. Only profiles you create here are
        listed in the admin database — app sign-ups manage their own accounts separately.
        Rankings and career stats are computed automatically from tournament results.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Full name (official) *</Label>
            <FieldCharCounter
              current={values.displayName.length}
              max={PLAYER_DISPLAY_NAME_MAX}
            />
          </div>
          <Input
            value={values.displayName}
            maxLength={PLAYER_DISPLAY_NAME_MAX}
            onChange={(e) => onChange({ displayName: e.target.value })}
            placeholder="e.g. Alejandro Galán"
            className="mt-1.5 border-cp-border bg-cp-elevated"
            aria-invalid={Boolean(errors?.displayName)}
          />
          {errors?.displayName ? (
            <p className="mt-1 text-xs text-red-400">{errors.displayName}</p>
          ) : null}
        </div>
        <div>
          <div className="flex items-center justify-between gap-2">
            <Label>Nickname / handle</Label>
            <FieldCharCounter current={values.nickname.length} max={PLAYER_NICKNAME_MAX} />
          </div>
          <Input
            value={values.nickname}
            maxLength={PLAYER_NICKNAME_MAX}
            onChange={(e) => onChange({ nickname: e.target.value })}
            placeholder="e.g. Galán"
            className="mt-1.5 border-cp-border bg-cp-elevated"
          />
          {errors?.nickname ? (
            <p className="mt-1 text-xs text-red-400">{errors.nickname}</p>
          ) : null}
        </div>
        <div>
          <div className="flex items-center justify-between gap-2">
            <Label>URL slug</Label>
            <FieldCharCounter current={values.slug.length} max={PLAYER_SLUG_MAX} />
          </div>
          <Input
            value={values.slug}
            maxLength={PLAYER_SLUG_MAX}
            onChange={(e) => onChange({ slug: e.target.value })}
            placeholder={slugifyWikiName(values.displayName) || "auto-generated"}
            className="mt-1.5 border-cp-border bg-cp-elevated font-mono text-sm"
          />
          {errors?.slug ? <p className="mt-1 text-xs text-red-400">{errors.slug}</p> : null}
        </div>
        <div>
          <div className="flex items-center justify-between gap-2">
            <Label>Nationality</Label>
            <FieldCharCounter
              current={values.nationality.length}
              max={PLAYER_NATIONALITY_MAX}
            />
          </div>
          <Input
            value={values.nationality}
            maxLength={PLAYER_NATIONALITY_MAX}
            onChange={(e) => onChange({ nationality: e.target.value })}
            placeholder="e.g. Spain (ESP)"
            className="mt-1.5 border-cp-border bg-cp-elevated"
          />
          {errors?.nationality ? (
            <p className="mt-1 text-xs text-red-400">{errors.nationality}</p>
          ) : null}
        </div>
        <div>
          <Label>Age</Label>
          <Input
            type="number"
            min={PLAYER_AGE_MIN}
            max={PLAYER_AGE_MAX}
            value={values.age}
            onChange={(e) => onChange({ age: e.target.value })}
            className="mt-1.5 border-cp-border bg-cp-elevated"
          />
          {errors?.age ? <p className="mt-1 text-xs text-red-400">{errors.age}</p> : null}
        </div>
      </div>

      <div>
        <Label>Tagline / short intro</Label>
        <RichTextEditor
          value={values.summary}
          onChange={(html) => onChange({ summary: html })}
          placeholder="One-line intro for the hero section"
          minHeight={96}
          maxLength={PLAYER_SUMMARY_MAX}
          className="mt-1.5"
        />
        {errors?.summary ? (
          <p className="mt-1 text-xs text-red-400">{errors.summary}</p>
        ) : null}
      </div>

      <div>
        <Label>Biography</Label>
        <RichTextEditor
          value={values.biography}
          onChange={(html) => onChange({ biography: html })}
          placeholder="Career history, playing style, achievements…"
          minHeight={200}
          maxLength={PLAYER_BIOGRAPHY_MAX}
          className="mt-1.5"
        />
        {errors?.biography ? (
          <p className="mt-1 text-xs text-red-400">{errors.biography}</p>
        ) : null}
      </div>

      <div>
        <Label>Social media links</Label>
        <div className="mt-2">
          <PlayerSocialLinksEditor
            links={values.socialLinks}
            onChange={(socialLinks) => onChange({ socialLinks })}
          />
        </div>
      </div>

      <div>
        <Label>Equipment</Label>
        <div className="mt-2">
          <PlayerEquipmentEditor
            sportSlug={sportSlug}
            items={values.equipment}
            onChange={(equipment) => onChange({ equipment })}
            equipmentPreviews={equipmentPreviews}
            onImageChange={onEquipmentImageChange}
            signatureGearId={values.signatureGearId}
            onSignatureChange={(signatureGearId) => onChange({ signatureGearId })}
          />
        </div>
      </div>
    </div>
  );
}
