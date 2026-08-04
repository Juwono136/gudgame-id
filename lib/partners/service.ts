import "server-only";

import { and, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { partnerMembers, partners, type Partner } from "@/db/schema/partners";
import { AppError } from "@/lib/errors";
import { sanitizePartnerBrandingInput } from "@/lib/partners/branding-validation";
import {
  isValidPartnerSlugFormat,
  normalizePartnerSlug,
  parsePartnerBranding,
  type PartnerBranding,
} from "@/lib/partners/constants";

export type PartnerPublicView = {
  id: string;
  slug: string;
  displayName: string;
  logoUrl: string | null;
  logoStorageKey: string | null;
  iconUrl: string | null;
  iconStorageKey: string | null;
  branding: PartnerBranding;
  isActive: boolean;
};

export type PartnerDashboardView = PartnerPublicView & {
  memberRole: string;
};

function toPublicView(row: Partner): PartnerPublicView {
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.displayName,
    logoUrl: row.logoUrl,
    logoStorageKey: row.logoStorageKey ?? null,
    iconUrl: row.iconUrl ?? null,
    iconStorageKey: row.iconStorageKey ?? null,
    branding: parsePartnerBranding(row.branding),
    isActive: row.isActive,
  };
}

export async function getPartnerBySlug(slug: string): Promise<Partner | null> {
  const normalized = normalizePartnerSlug(slug);
  if (!normalized) return null;
  const [row] = await getDb()
    .select()
    .from(partners)
    .where(eq(partners.slug, normalized))
    .limit(1);
  return row ?? null;
}

export async function getActivePartnerBySlug(
  slug: string,
): Promise<PartnerPublicView | null> {
  const row = await getPartnerBySlug(slug);
  if (!row || !row.isActive) return null;
  return toPublicView(row);
}

export async function getPartnerById(id: string): Promise<Partner | null> {
  const [row] = await getDb()
    .select()
    .from(partners)
    .where(eq(partners.id, id))
    .limit(1);
  return row ?? null;
}

export async function listPartnersForUser(userId: string): Promise<PartnerDashboardView[]> {
  const rows = await getDb()
    .select({
      partner: partners,
      memberRole: partnerMembers.role,
    })
    .from(partnerMembers)
    .innerJoin(partners, eq(partnerMembers.partnerId, partners.id))
    .where(eq(partnerMembers.userId, userId));

  return rows.map((r) => ({
    ...toPublicView(r.partner),
    memberRole: r.memberRole,
  }));
}

export async function getPrimaryPartnerForUser(
  userId: string,
): Promise<PartnerDashboardView | null> {
  const list = await listPartnersForUser(userId);
  return list[0] ?? null;
}

export async function assertUserIsPartnerMember(
  userId: string,
  partnerId: string,
): Promise<void> {
  const [row] = await getDb()
    .select({ id: partnerMembers.id })
    .from(partnerMembers)
    .where(
      and(eq(partnerMembers.userId, userId), eq(partnerMembers.partnerId, partnerId)),
    )
    .limit(1);
  if (!row) {
    throw new AppError("Partner access required", {
      code: "FORBIDDEN",
      statusCode: 403,
    });
  }
}

export type CreatePartnerInput = {
  slug: string;
  displayName: string;
  logoUrl?: string | null;
  logoStorageKey?: string | null;
  branding?: PartnerBranding;
  ownerUserId: string;
  createdBy: string;
};

/**
 * Validate + normalize partner slug/name before account creation so invite
 * emails are not sent for requests that will fail at workspace provisioning.
 */
export async function assertPartnerCreateReady(input: {
  slug: string;
  displayName: string;
}): Promise<{ slug: string; displayName: string }> {
  const slug = normalizePartnerSlug(input.slug);
  if (!isValidPartnerSlugFormat(slug)) {
    throw new AppError(
      "Invalid partner route slug. Use 2–80 characters: letters, numbers, hyphens. Avoid reserved paths.",
      { code: "VALIDATION_ERROR", statusCode: 422 },
    );
  }

  const displayName = input.displayName.trim();
  if (displayName.length < 2 || displayName.length > 120) {
    throw new AppError("Partner display name must be 2–120 characters", {
      code: "VALIDATION_ERROR",
      statusCode: 422,
    });
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: partners.id })
    .from(partners)
    .where(eq(partners.slug, slug))
    .limit(1);
  if (existing) {
    throw new AppError("A partner with this route slug already exists", {
      code: "CONFLICT",
      statusCode: 409,
    });
  }

  return { slug, displayName };
}

export async function createPartnerWithOwner(
  input: CreatePartnerInput,
): Promise<PartnerPublicView> {
  const { slug, displayName } = await assertPartnerCreateReady({
    slug: input.slug,
    displayName: input.displayName,
  });

  const db = getDb();
  const [created] = await db
    .insert(partners)
    .values({
      slug,
      displayName,
      logoUrl: input.logoUrl ?? null,
      logoStorageKey: input.logoStorageKey ?? null,
      branding: input.branding ?? {},
      isActive: true,
      createdBy: input.createdBy,
    })
    .returning();

  if (!created) {
    throw new AppError("Failed to create partner", {
      code: "INTERNAL_ERROR",
      statusCode: 500,
    });
  }

  await db.insert(partnerMembers).values({
    partnerId: created.id,
    userId: input.ownerUserId,
    role: "owner",
  });

  return toPublicView(created);
}

export async function ensurePartnerMembership(
  partnerId: string,
  userId: string,
  role: "owner" | "staff" = "owner",
): Promise<void> {
  const db = getDb();
  const [existing] = await db
    .select({ id: partnerMembers.id })
    .from(partnerMembers)
    .where(
      and(eq(partnerMembers.partnerId, partnerId), eq(partnerMembers.userId, userId)),
    )
    .limit(1);
  if (existing) return;
  await db.insert(partnerMembers).values({ partnerId, userId, role });
}

export async function updatePartnerBranding(
  partnerId: string,
  input: {
    displayName?: string;
    slug?: string;
    logoUrl?: string | null;
    logoStorageKey?: string | null;
    iconUrl?: string | null;
    iconStorageKey?: string | null;
    branding?: PartnerBranding;
    isActive?: boolean;
  },
): Promise<PartnerPublicView> {
  const db = getDb();
  const existing = await getPartnerById(partnerId);
  if (!existing) {
    throw new AppError("Partner not found", { code: "NOT_FOUND", statusCode: 404 });
  }

  const patch: Partial<typeof partners.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.displayName !== undefined) {
    const name = input.displayName.trim();
    if (name.length < 2 || name.length > 120) {
      throw new AppError("Partner display name must be 2–120 characters", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }
    patch.displayName = name;
  }

  if (input.slug !== undefined) {
    const slug = normalizePartnerSlug(input.slug);
    if (!isValidPartnerSlugFormat(slug)) {
      throw new AppError("Invalid partner route slug", {
        code: "VALIDATION_ERROR",
        statusCode: 422,
      });
    }
    if (slug !== existing.slug) {
      const [taken] = await db
        .select({ id: partners.id })
        .from(partners)
        .where(eq(partners.slug, slug))
        .limit(1);
      if (taken) {
        throw new AppError("A partner with this route slug already exists", {
          code: "CONFLICT",
          statusCode: 409,
        });
      }
      patch.slug = slug;
    }
  }

  if (input.logoUrl !== undefined) patch.logoUrl = input.logoUrl;
  if (input.logoStorageKey !== undefined) patch.logoStorageKey = input.logoStorageKey;
  if (input.iconUrl !== undefined) patch.iconUrl = input.iconUrl;
  if (input.iconStorageKey !== undefined) patch.iconStorageKey = input.iconStorageKey;
  if (input.branding !== undefined) {
    const merged = sanitizePartnerBrandingInput({
      ...parsePartnerBranding(existing.branding),
      ...input.branding,
    });
    // Re-parse so empty strings clear fields instead of lingering in JSON.
    patch.branding = parsePartnerBranding({
      primaryColor: merged.primaryColor ?? "",
      accentColor: merged.accentColor ?? "",
      backgroundStyle: merged.backgroundStyle ?? "",
      tagline: merged.tagline ?? "",
      about: merged.about ?? "",
      heroTitle: merged.heroTitle ?? "",
      contactEmail: merged.contactEmail ?? "",
      contactWhatsapp: merged.contactWhatsapp ?? "",
      contactWebsite: merged.contactWebsite ?? "",
    });
  }
  if (input.isActive !== undefined) patch.isActive = input.isActive;

  const [updated] = await db
    .update(partners)
    .set(patch)
    .where(eq(partners.id, partnerId))
    .returning();

  if (!updated) {
    throw new AppError("Partner not found", { code: "NOT_FOUND", statusCode: 404 });
  }
  return toPublicView(updated);
}

export async function listAllPartners(search?: string): Promise<PartnerPublicView[]> {
  const db = getDb();
  const conditions = [];
  if (search?.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(ilike(partners.displayName, term), ilike(partners.slug, term)),
    );
  }
  const rows = await db
    .select()
    .from(partners)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(sql`${partners.displayName} asc`);
  return rows.map(toPublicView);
}
