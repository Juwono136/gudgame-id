import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PlayerShareButton } from "@/components/wiki/player/player-share-button";
import { PlayerPageCard } from "@/components/wiki/player/player-page-card";
import type { PlayerEquipmentItem } from "@/lib/wiki/player-equipment";
import type { PlayerSocialLink } from "@/lib/wiki/player-profile-fields";
import { resolveWikiImageUrl } from "@/lib/media/client";
import { cn } from "@/lib/utils";

type PlayerSidebarProps = {
  displayName: string;
  nationality?: string | null;
  age?: number | null;
  yearsActive?: string | null;
  signatureGear: PlayerEquipmentItem | null;
  socialLinks: PlayerSocialLink[];
  equipment: PlayerEquipmentItem[];
  galleryUrls: string[];
};

function BiodataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-cp-border/60 py-2.5 last:border-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-cp-muted">{label}</dt>
      <dd className="text-right text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}

export function PlayerSidebar({
  displayName,
  nationality,
  age,
  yearsActive,
  signatureGear,
  socialLinks,
  equipment,
  galleryUrls,
}: PlayerSidebarProps) {
  return (
    <aside className="space-y-5 lg:space-y-6">
      <PlayerPageCard title="Biodata">
        <dl>
          <BiodataRow label="Full name" value={displayName} />
          {nationality ? <BiodataRow label="Nationality" value={nationality} /> : null}
          {age != null ? <BiodataRow label="Age" value={String(age)} /> : null}
          {yearsActive ? <BiodataRow label="Years active" value={yearsActive} /> : null}
        </dl>
        <div className="mt-4 border-t border-cp-border pt-4">
          <PlayerShareButton title={displayName} />
        </div>
      </PlayerPageCard>

      {signatureGear ? (
        <PlayerPageCard title="Signature gear" variant="highlight">
          <div className="flex items-center gap-4">
            {signatureGear.imageUrl ? (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-cp-primary/20 bg-white dark:bg-cp-elevated">
                <Image
                  src={resolveWikiImageUrl(signatureGear.imageUrl) ?? signatureGear.imageUrl}
                  alt=""
                  fill
                  className="object-contain p-1"
                  sizes="64px"
                />
              </div>
            ) : null}
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{signatureGear.name}</p>
              {signatureGear.brand ? (
                <p className="text-sm text-cp-muted">{signatureGear.brand}</p>
              ) : null}
              {signatureGear.category ? (
                <p className="mt-0.5 text-xs capitalize text-cp-text-dim">
                  {signatureGear.category}
                </p>
              ) : null}
            </div>
          </div>
        </PlayerPageCard>
      ) : null}

      {socialLinks.length > 0 ? (
        <PlayerPageCard title="Social">
          <ul className="space-y-2.5">
            {socialLinks.map((link) => (
              <li key={link.id}>
                <Link
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-cp-primary hover:underline"
                >
                  {link.label}
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </li>
            ))}
          </ul>
        </PlayerPageCard>
      ) : null}

      {equipment.length > 0 ? (
        <PlayerPageCard title="Equipment">
          <ul className="space-y-3">
            {equipment.map((item) => {
              const imageUrl = resolveWikiImageUrl(item.imageUrl);
              const isSignature = signatureGear?.id === item.id;
              return (
                <li
                  key={item.id}
                  className={cn(
                    "flex gap-3 rounded-xl border p-3",
                    isSignature
                      ? "border-cp-primary/25 bg-cp-primary/5"
                      : "border-cp-border bg-cp-elevated/40",
                  )}
                >
                  {imageUrl ? (
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-white dark:bg-cp-elevated">
                      <Image
                        src={imageUrl}
                        alt=""
                        fill
                        className="object-contain p-0.5"
                        sizes="56px"
                      />
                    </div>
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-cp-elevated text-[10px] text-cp-muted">
                      Gear
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{item.name}</p>
                    <p className="text-xs capitalize text-cp-muted">{item.category}</p>
                    {item.brand ? (
                      <p className="mt-0.5 text-xs text-cp-text-dim">{item.brand}</p>
                    ) : null}
                    {item.notes ? (
                      <p className="mt-1 text-xs leading-relaxed text-cp-muted">{item.notes}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </PlayerPageCard>
      ) : null}

      {galleryUrls.length > 0 ? (
        <PlayerPageCard title="Gallery">
          <div className="grid grid-cols-2 gap-2">
            {galleryUrls.slice(0, 4).map((url, i) => (
              <div
                key={`${url}-${i}`}
                className="relative aspect-square overflow-hidden rounded-xl bg-cp-elevated"
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  className="object-cover transition-transform duration-300 hover:scale-105"
                  sizes="(max-width: 1024px) 45vw, 180px"
                />
              </div>
            ))}
          </div>
        </PlayerPageCard>
      ) : null}
    </aside>
  );
}
