"use client";

import Image from "next/image";
import {
  ExternalLink,
  ImageIcon,
  Pencil,
  Share2,
  UserRound,
} from "lucide-react";
import { TournamentReviewRichBlock } from "@/components/tournaments/form/tournament-review-rich-block";
import { Badge } from "@/components/ui/badge";
import type { GallerySlot } from "@/components/admin/wiki/gallery-upload-field";
import type { PlayerEquipmentItem } from "@/lib/wiki/player-equipment";
import type { PlayerSocialLink } from "@/lib/wiki/player-profile-fields";
import { statusBadgeClass } from "@/lib/styles/status-badges";
import { hasRichTextContent } from "@/lib/wiki/validate-player-wizard";
import { cn } from "@/lib/utils";

type PlayerWizardReviewProps = {
  sportSlug: string;
  displayName: string;
  nickname: string;
  slug: string;
  nationality: string;
  age: string;
  summary: string;
  biography: string;
  status: string;
  sourceType: string;
  socialLinks: PlayerSocialLink[];
  equipment: PlayerEquipmentItem[];
  equipmentPreviews: Record<string, string>;
  signatureGearId: string | null;
  primaryPreview: string;
  gallerySlots: GallerySlot[];
  mode: "create" | "edit";
  onEditProfile?: () => void;
};

function ReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-cp-border/60 bg-cp-elevated/20 px-3 py-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-cp-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-sm font-medium text-foreground">{value || "—"}</dd>
    </div>
  );
}

function statusLabel(status: string) {
  if (status === "published") return "Published";
  if (status === "draft") return "Draft";
  if (status === "archived") return "Archived";
  return status;
}

export function PlayerWizardReview({
  sportSlug,
  displayName,
  nickname,
  slug,
  nationality,
  age,
  summary,
  biography,
  status,
  sourceType,
  socialLinks,
  equipment,
  equipmentPreviews,
  signatureGearId,
  primaryPreview,
  gallerySlots,
  mode,
  onEditProfile,
}: PlayerWizardReviewProps) {
  const resolvedSlug = slug.trim() || displayName.trim().toLowerCase().replace(/\s+/g, "-");
  const galleryCount = gallerySlots.filter((s) => s.preview || s.existingUrl).length;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="rounded-xl border border-cp-primary/25 bg-cp-primary/5 px-4 py-3 sm:px-5">
        <p className="text-sm font-medium text-foreground">
          {mode === "edit" ? "Review your changes" : "Ready to save or publish"}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-cp-muted">
          Editorial player profile for{" "}
          <span className="capitalize text-cp-logo-accent">{sportSlug}</span>. Published entries
          appear on the public player wiki at{" "}
          <span className="font-mono text-foreground/80">/{resolvedSlug}</span>.
        </p>
      </div>

      <section className="overflow-hidden rounded-xl border border-cp-border bg-cp-card shadow-sm">
        <div className="relative border-b border-cp-border bg-cp-elevated/30 p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <div className="relative mx-auto h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-cp-border bg-cp-elevated sm:mx-0 sm:h-28 sm:w-28">
              {primaryPreview ? (
                <Image
                  src={primaryPreview}
                  alt=""
                  width={112}
                  height={112}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-cp-muted">
                  <UserRound className="h-10 w-10" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <Badge className="border-0 bg-cp-primary/15 text-[10px] uppercase text-cp-primary">
                  Player
                </Badge>
                <Badge
                  className={cn(
                    "border-0 text-[10px] uppercase",
                    status === "published" ? statusBadgeClass.success : statusBadgeClass.muted,
                  )}
                >
                  {statusLabel(status)}
                </Badge>
              </div>
              <h2 className="mt-2 text-xl font-bold text-foreground sm:text-2xl">
                {displayName.trim() || "Untitled player"}
              </h2>
              {nickname.trim() ? (
                <p className="mt-0.5 text-sm text-cp-muted">@{nickname.trim()}</p>
              ) : null}
              <p className="mt-1 font-mono text-xs text-cp-muted">/{resolvedSlug}</p>
            </div>
            {onEditProfile ? (
              <button
                type="button"
                onClick={onEditProfile}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 self-center rounded-lg border border-cp-border px-3 py-2 text-xs font-medium text-cp-muted transition-colors hover:border-cp-primary/40 hover:text-foreground sm:self-start"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit profile
              </button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:p-5">
          <ReviewField label="Nationality" value={nationality.trim()} />
          <ReviewField label="Age" value={age.trim() ? `${age.trim()} years` : ""} />
          <ReviewField label="Source" value={sourceType} />
          <ReviewField
            label="Gallery"
            value={galleryCount > 0 ? `${galleryCount} photo${galleryCount === 1 ? "" : "s"}` : ""}
          />
        </div>
      </section>

      {hasRichTextContent(summary) ? (
        <TournamentReviewRichBlock label="Tagline / short intro" html={summary} />
      ) : (
        <div className="rounded-lg border border-dashed border-cp-border/80 bg-cp-elevated/10 px-4 py-3 text-sm text-cp-muted">
          No tagline added.
        </div>
      )}

      {hasRichTextContent(biography) ? (
        <TournamentReviewRichBlock label="Biography" html={biography} containerClassName="sm:p-4" />
      ) : (
        <div className="rounded-lg border border-dashed border-cp-border/80 bg-cp-elevated/10 px-4 py-3 text-sm text-cp-muted">
          No biography added.
        </div>
      )}

      <section className="rounded-xl border border-cp-border bg-cp-card p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Share2 className="h-4 w-4 text-cp-primary" />
          <h3 className="text-sm font-semibold text-foreground">Social links</h3>
        </div>
        {socialLinks.length > 0 ? (
          <ul className="space-y-2">
            {socialLinks.map((link) => (
              <li
                key={link.id}
                className="flex flex-col gap-0.5 rounded-lg border border-cp-border/60 bg-cp-elevated/20 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-sm font-medium text-foreground">{link.label}</span>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-full items-center gap-1 truncate text-xs text-cp-primary hover:underline"
                >
                  {link.url}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-cp-muted">No social links added.</p>
        )}
      </section>

      <section className="rounded-xl border border-cp-border bg-cp-card p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-foreground">Equipment</h3>
        {equipment.length > 0 ? (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {equipment.map((item) => {
              const preview = equipmentPreviews[item.id] ?? item.imageUrl;
              const isSignature = signatureGearId === item.id;
              return (
                <li
                  key={item.id}
                  className={cn(
                    "flex gap-3 rounded-lg border px-3 py-2.5",
                    isSignature
                      ? "border-cp-primary/40 bg-cp-primary/5"
                      : "border-cp-border/60 bg-cp-elevated/20",
                  )}
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-cp-border bg-cp-elevated">
                    {preview ? (
                      <Image
                        src={preview}
                        alt=""
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-cp-muted">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs capitalize text-cp-muted">
                      {item.category?.replace("_", " ") ?? "—"}
                      {item.brand ? ` · ${item.brand}` : ""}
                    </p>
                    {isSignature ? (
                      <p className="mt-0.5 text-[10px] font-semibold uppercase text-cp-primary">
                        Signature gear
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-cp-muted">No equipment listed.</p>
        )}
      </section>

      {galleryCount > 0 ? (
        <section className="rounded-xl border border-cp-border bg-cp-card p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-foreground">Photo gallery</h3>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {gallerySlots
              .filter((s) => s.preview || s.existingUrl)
              .map((slot) => (
                <div
                  key={slot.id}
                  className="relative aspect-square overflow-hidden rounded-lg border border-cp-border bg-cp-elevated"
                >
                  <Image
                    src={slot.preview || slot.existingUrl || ""}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, 25vw"
                    unoptimized
                  />
                </div>
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
