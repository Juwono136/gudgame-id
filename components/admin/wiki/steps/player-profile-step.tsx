"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { slugifyWikiName } from "@/lib/wiki/slug";
import { RichTextEditor } from "@/components/admin/wiki/rich-text-editor";
import { PlayerSocialLinksEditor } from "@/components/settings/player-social-links-editor";
import { PlayerEquipmentEditor } from "@/components/settings/player-equipment-editor";
import type { PlayerEquipmentItem } from "@/lib/wiki/player-equipment";
import type { PlayerSocialLink } from "@/lib/wiki/player-profile-fields";
import {
  PLAYER_AGE_MAX,
  PLAYER_AGE_MIN,
  PLAYER_DISPLAY_NAME_MAX,
  PLAYER_NATIONALITY_MAX,
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
  values: PlayerProfileValues;
  onChange: (patch: Partial<PlayerProfileValues>) => void;
  errors?: Partial<Record<keyof PlayerProfileValues, string>>;
  equipmentPreviews: Record<string, string>;
  onEquipmentImageChange: (id: string, file: File | null) => void;
};

export function PlayerProfileStep({
  values,
  onChange,
  errors,
  equipmentPreviews,
  onEquipmentImageChange,
}: PlayerProfileStepProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm text-cp-muted">
        Athlete profile for the public player wiki — matches the player My Settings schema.
        Rankings and career stats are computed automatically from tournament results.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Full name (official) *</Label>
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
          <Label>Nickname / handle</Label>
          <Input
            value={values.nickname}
            maxLength={120}
            onChange={(e) => onChange({ nickname: e.target.value })}
            placeholder="e.g. Galán"
            className="mt-1.5 border-cp-border bg-cp-elevated"
          />
        </div>
        <div>
          <Label>URL slug</Label>
          <Input
            value={values.slug}
            maxLength={120}
            onChange={(e) => onChange({ slug: e.target.value })}
            placeholder={slugifyWikiName(values.displayName) || "auto-generated"}
            className="mt-1.5 border-cp-border bg-cp-elevated font-mono text-sm"
          />
          {errors?.slug ? <p className="mt-1 text-xs text-red-400">{errors.slug}</p> : null}
        </div>
        <div>
          <Label>Nationality</Label>
          <Input
            value={values.nationality}
            maxLength={PLAYER_NATIONALITY_MAX}
            onChange={(e) => onChange({ nationality: e.target.value })}
            placeholder="e.g. Spain (ESP)"
            className="mt-1.5 border-cp-border bg-cp-elevated"
          />
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
        </div>
      </div>

      <div>
        <Label>Tagline / short intro</Label>
        <RichTextEditor
          value={values.summary}
          onChange={(html) => onChange({ summary: html })}
          placeholder="One-line intro for the hero section"
          minHeight={80}
          className="mt-1.5"
        />
      </div>

      <div>
        <Label>Biography</Label>
        <RichTextEditor
          value={values.biography}
          onChange={(html) => onChange({ biography: html })}
          placeholder="Career history, playing style, achievements…"
          minHeight={200}
          className="mt-1.5"
        />
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
