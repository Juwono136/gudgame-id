/**
 * Shared helpers for local tournament fixture seeds (dev-only).
 */
import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq, inArray, like } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { getDb } from "@/db/client";
import { account, user } from "@/db/schema/auth";
import { playerMatches } from "@/db/schema/player-competition";
import { sports } from "@/db/schema/sports";
import {
  tournamentRegistrations,
  tournamentTeamMembers,
  tournamentTeams,
} from "@/db/schema/tournament-registration";
import { tournamentPayments } from "@/db/schema/tournament-payments";
import { tournaments } from "@/db/schema/tournaments";
import {
  PLAYER_TIER_LEVELS,
  PLAYER_TIER_POINT_THRESHOLDS,
  TOURNAMENT_TIER_MATCH_POINTS,
  type PlayerTierLevel,
} from "@/lib/player/tier";
import type { AppRole } from "@/lib/roles/constants";
import { getUserRoleAssignments, setUserRoles } from "@/lib/roles/sync";
import { deleteTournament } from "@/lib/tournaments/service";

export const SEED_EMAIL_DOMAIN = "gudgame.local";
export const DEFAULT_SEED_PASSWORD = "SeedPlayer1!";
export const CREDENTIAL_PROVIDER_ID = "credential";

export const DOUBLE_STAGE_TEAM_COUNT = 32;
export const FORMAT_FIXTURE_TEAM_COUNT = 16;
export const PLAYERS_PER_TEAM = 2;

/** Set by CI/CD deploy job for idempotent fixture ensure (never destructive). */
export function isDeployFixtureSeedMode(): boolean {
  return process.env.ALLOW_DEPLOY_FIXTURE_SEED === "true";
}

/**
 * Guard for seed/purge scripts.
 * - Local: allowed in non-production (or FORCE_DEV_SEED=true).
 * - CI/CD deploy: only when ALLOW_DEPLOY_FIXTURE_SEED=true and caller opts into ensure mode.
 * - Purge / --reset remain blocked in deploy mode.
 */
export function assertDevOnlySeed(
  scriptLabel: string,
  options?: { allowDeployEnsure?: boolean },
): void {
  const deployEnsure =
    Boolean(options?.allowDeployEnsure) && isDeployFixtureSeedMode();

  if (process.env.GITHUB_ACTIONS === "true" && !deployEnsure) {
    throw new Error(
      `Refusing to run ${scriptLabel}: not allowed in CI unless ALLOW_DEPLOY_FIXTURE_SEED=true (idempotent ensure).`,
    );
  }

  if (
    process.env.NODE_ENV === "production" &&
    process.env.FORCE_DEV_SEED !== "true" &&
    !deployEnsure
  ) {
    throw new Error(
      `Refusing to run ${scriptLabel} in production. Set FORCE_DEV_SEED=true for manual fixtures, or ALLOW_DEPLOY_FIXTURE_SEED=true for deploy ensure.`,
    );
  }
}

/** Deploy ensure must never purge or recreate existing tournaments. */
export function assertIdempotentEnsure(scriptLabel: string, reset: boolean): void {
  if (reset && isDeployFixtureSeedMode()) {
    throw new Error(
      `Refusing --reset in ${scriptLabel} during deploy fixture seed. Ensure mode only creates missing fixtures.`,
    );
  }
}

export function normalizeEnv(value: string | undefined): string {
  const trimmed = (value ?? "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function takeFlagValue(
  argv: string[],
  index: number,
  prefix: string,
): string | null {
  const arg = argv[index]!;
  if (arg.startsWith(`${prefix}=`)) {
    return arg.slice(prefix.length + 1).trim() || null;
  }
  if (arg === prefix) {
    return argv[index + 1]?.trim() || null;
  }
  return null;
}

export function parseCreatorEmail(argv: string[]): string | null {
  for (let i = 0; i < argv.length; i += 1) {
    const nameEmail = takeFlagValue(argv, i, "--name");
    if (nameEmail != null) return nameEmail.toLowerCase();
    const email = takeFlagValue(argv, i, "--email");
    if (email != null) return email.toLowerCase();
  }
  return (
    normalizeEnv(process.env.SEED_DOUBLE_STAGE_HOST_EMAIL).toLowerCase() ||
    normalizeEnv(process.env.SEED_FIXTURE_HOST_EMAIL).toLowerCase() ||
    null
  );
}

export function isOfficialCreatorRole(roles: AppRole[]): boolean {
  return roles.includes("host") || roles.includes("super_admin");
}

export async function resolveCreatorUser(email: string): Promise<{
  userId: string;
  email: string;
  roles: AppRole[];
}> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    throw new Error(
      "Creator email is required. Example:\n" +
        "  npm run db:seed:double-stage -- --name juwonoindonesia@gmail.com",
    );
  }

  const [existing] = await getDb()
    .select({
      id: user.id,
      email: user.email,
      isActive: user.isActive,
    })
    .from(user)
    .where(eq(user.email, normalized))
    .limit(1);

  if (!existing) {
    throw new Error(
      `User "${normalized}" was not found. Register / bootstrap that account first, then re-run the seed.`,
    );
  }
  if (!existing.isActive) {
    throw new Error(`User "${normalized}" is inactive and cannot create tournaments.`);
  }

  let roles = await getUserRoleAssignments(existing.id);
  if (!isOfficialCreatorRole(roles)) {
    const merged = [...new Set<AppRole>([...roles, "host", "player"])];
    await setUserRoles(existing.id, merged);
    roles = await getUserRoleAssignments(existing.id);
    console.log(
      `[seed] Granted host role to ${normalized} (roles: ${roles.join(", ")})`,
    );
  }

  if (!isOfficialCreatorRole(roles)) {
    throw new Error(
      `User "${normalized}" still lacks host/super_admin after role update.`,
    );
  }

  return { userId: existing.id, email: existing.email, roles };
}

export async function resolveSport(
  sportSlug: string,
): Promise<{ id: string; slug: string }> {
  const [row] = await getDb()
    .select({ id: sports.id, slug: sports.slug })
    .from(sports)
    .where(eq(sports.slug, sportSlug))
    .limit(1);

  if (!row) {
    throw new Error(
      `Sport "${sportSlug}" not found. Run \`npm run db:seed\` first to provision sports.`,
    );
  }
  return row;
}

export async function ensureCredentialUser(input: {
  email: string;
  name: string;
  password: string;
  roles: AppRole[];
}): Promise<string> {
  const db = getDb();
  const email = input.email.toLowerCase();
  const now = new Date();

  const [existing] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (existing) {
    await db
      .update(user)
      .set({
        name: input.name,
        fullNameKtp: input.name,
        emailVerified: true,
        isActive: true,
        mustChangePassword: false,
        gender: null,
        updatedAt: now,
      })
      .where(eq(user.id, existing.id));

    const hashed = await hashPassword(input.password);
    const [cred] = await db
      .select({ id: account.id })
      .from(account)
      .where(
        and(
          eq(account.userId, existing.id),
          eq(account.providerId, CREDENTIAL_PROVIDER_ID),
        ),
      )
      .limit(1);

    if (cred) {
      await db
        .update(account)
        .set({ password: hashed, updatedAt: now })
        .where(eq(account.id, cred.id));
    } else {
      await db.insert(account).values({
        id: randomUUID(),
        accountId: existing.id,
        providerId: CREDENTIAL_PROVIDER_ID,
        userId: existing.id,
        password: hashed,
        createdAt: now,
        updatedAt: now,
      });
    }

    await setUserRoles(existing.id, input.roles);
    return existing.id;
  }

  const userId = randomUUID();
  const hashed = await hashPassword(input.password);

  await db.insert(user).values({
    id: userId,
    name: input.name,
    email,
    emailVerified: true,
    isActive: true,
    mustChangePassword: false,
    invitedByAdmin: false,
    fullNameKtp: input.name,
    gender: null,
    role: input.roles[0] ?? "player",
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(account).values({
    id: randomUUID(),
    accountId: userId,
    providerId: CREDENTIAL_PROVIDER_ID,
    userId,
    password: hashed,
    createdAt: now,
    updatedAt: now,
  });

  await setUserRoles(userId, input.roles);
  return userId;
}

export async function ensureSeedPlayers(input: {
  emailPrefix: string;
  displayPrefix: string;
  count: number;
  password: string;
}): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 1; i <= input.count; i += 1) {
    const email = `${input.emailPrefix}${String(i).padStart(3, "0")}@${SEED_EMAIL_DOMAIN}`;
    const name = `${input.displayPrefix} ${String(i).padStart(2, "0")}`;
    const id = await ensureCredentialUser({
      email,
      name,
      password: input.password,
      roles: ["player"],
    });
    ids.push(id);
  }
  return ids;
}

export async function insertConfirmedTeams(input: {
  tournamentId: string;
  playerIds: string[];
  teamCount: number;
  teamNamePrefix: string;
}): Promise<void> {
  const db = getDb();
  const now = new Date();
  const needed = input.teamCount * PLAYERS_PER_TEAM;
  if (input.playerIds.length < needed) {
    throw new Error(
      `Need ${needed} players for ${input.teamCount} teams, got ${input.playerIds.length}`,
    );
  }

  for (let t = 0; t < input.teamCount; t += 1) {
    const captainId = input.playerIds[t * 2]!;
    const memberId = input.playerIds[t * 2 + 1]!;
    const teamId = randomUUID();
    const registrationId = randomUUID();

    await db.insert(tournamentTeams).values({
      id: teamId,
      tournamentId: input.tournamentId,
      name: `${input.teamNamePrefix} ${String(t + 1).padStart(2, "0")}`,
      captainUserId: captainId,
      sortOrder: t,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(tournamentTeamMembers).values([
      {
        id: randomUUID(),
        teamId,
        userId: captainId,
        slotIndex: 0,
        role: "captain",
        joinedAt: now,
      },
      {
        id: randomUUID(),
        teamId,
        userId: memberId,
        slotIndex: 1,
        role: "member",
        joinedAt: now,
      },
    ]);

    await db.insert(tournamentRegistrations).values({
      id: registrationId,
      tournamentId: input.tournamentId,
      teamId,
      registeredByUserId: captainId,
      status: "confirmed",
      confirmedAt: now,
      confirmedByUserId: captainId,
      createdAt: now,
      updatedAt: now,
    });
  }
}

/**
 * Seed synthetic official wins so `deriveTierFromPoints` places players at `targetTier`.
 * Bronze = no rows (default). Higher tiers get enough +points via legacy ±5 fallback
 * (matches without tournament skill tier).
 */
export async function seedPlayerTierPoints(input: {
  userIds: string[];
  sportId: string;
  targetTier: PlayerTierLevel;
}): Promise<void> {
  const targetPoints = PLAYER_TIER_POINT_THRESHOLDS[input.targetTier];
  if (targetPoints <= 0) return;

  // Without tournament skill tier, official win ≈ +5 (legacy fallback).
  const pointsPerWin = 5;
  const winsNeeded = Math.ceil(targetPoints / pointsPerWin);
  const db = getDb();
  const now = new Date();

  for (const userId of input.userIds) {
    await db
      .delete(playerMatches)
      .where(
        and(
          eq(playerMatches.userId, userId),
          eq(playerMatches.sportId, input.sportId),
          like(playerMatches.tournamentName, "Seed tier bootstrap%"),
        ),
      );

    const rows = Array.from({ length: winsNeeded }, (_, i) => ({
      userId,
      sportId: input.sportId,
      tournamentId: null as string | null,
      isOfficial: true,
      statsTier: "official_free" as const,
      tournamentName: `Seed tier bootstrap (${input.targetTier})`,
      opponents: "Seed opponent",
      resultType: "win" as const,
      score: "6–0",
      round: `Bootstrap ${i + 1}`,
      playedAt: new Date(now.getTime() - (winsNeeded - i) * 60_000),
      createdAt: now,
    }));

    if (rows.length) {
      await db.insert(playerMatches).values(rows);
    }
  }
}

export async function purgeTournamentsBySlugs(input: {
  sportId: string;
  slugs: string[];
}): Promise<{ removed: number; paymentsDeleted: number }> {
  const db = getDb();
  let removed = 0;
  let paymentsDeleted = 0;

  for (const slug of input.slugs) {
    const [existing] = await db
      .select({ id: tournaments.id })
      .from(tournaments)
      .where(and(eq(tournaments.sportId, input.sportId), eq(tournaments.slug, slug)))
      .limit(1);
    if (!existing) continue;

    const deletedPayments = await db
      .delete(tournamentPayments)
      .where(eq(tournamentPayments.tournamentId, existing.id))
      .returning({ id: tournamentPayments.id });
    paymentsDeleted += deletedPayments.length;

    await db.delete(playerMatches).where(eq(playerMatches.tournamentId, existing.id));
    await deleteTournament(existing.id, input.sportId);
    removed += 1;
  }

  return { removed, paymentsDeleted };
}

export async function deleteSeedPlayersByPrefix(emailPrefix: string): Promise<number> {
  const db = getDb();
  const pattern = `${emailPrefix}%@${SEED_EMAIL_DOMAIN}`;
  const rows = await db
    .select({ id: user.id })
    .from(user)
    .where(like(user.email, pattern));
  if (!rows.length) return 0;
  const ids = rows.map((r) => r.id);
  await db.delete(account).where(inArray(account.userId, ids));
  await db.delete(user).where(inArray(user.id, ids));
  return ids.length;
}

export function doubleStageSlugForTier(tier: PlayerTierLevel): string {
  return `dev-ds-${tier}-32`;
}

export function doubleStagePlayerPrefix(tier: PlayerTierLevel): string {
  return `ds32-${tier}-p`;
}

export const ALL_SKILL_TIERS: readonly PlayerTierLevel[] = PLAYER_TIER_LEVELS;

export function tierMatchPointsLabel(tier: PlayerTierLevel): string {
  const n = TOURNAMENT_TIER_MATCH_POINTS[tier];
  return `±${n}`;
}

export type FormatFixtureDef = {
  key: string;
  slug: string;
  name: string;
  tournamentType: "official" | "fun_match";
  billing: "free" | "paid" | null;
  format: "americano" | "single_elimination";
  emailPrefix: string;
  teamPrefix: string;
};

/** Official paid/free + Fun Match · Americano / Elimination. */
export const FORMAT_FIXTURES: FormatFixtureDef[] = [
  {
    key: "official-free-americano",
    slug: "dev-official-free-americano",
    name: "Dev Official Free · Americano",
    tournamentType: "official",
    billing: "free",
    format: "americano",
    emailPrefix: "fx-ofa-p",
    teamPrefix: "OFA Team",
  },
  {
    key: "official-paid-americano",
    slug: "dev-official-paid-americano",
    name: "Dev Official Paid · Americano",
    tournamentType: "official",
    billing: "paid",
    format: "americano",
    emailPrefix: "fx-opa-p",
    teamPrefix: "OPA Team",
  },
  {
    key: "official-free-elimination",
    slug: "dev-official-free-elim",
    name: "Dev Official Free · Elimination",
    tournamentType: "official",
    billing: "free",
    format: "single_elimination",
    emailPrefix: "fx-ofe-p",
    teamPrefix: "OFE Team",
  },
  {
    key: "official-paid-elimination",
    slug: "dev-official-paid-elim",
    name: "Dev Official Paid · Elimination",
    tournamentType: "official",
    billing: "paid",
    format: "single_elimination",
    emailPrefix: "fx-ope-p",
    teamPrefix: "OPE Team",
  },
  {
    key: "fun-americano",
    slug: "dev-fun-americano",
    name: "Dev Fun Match · Americano",
    tournamentType: "fun_match",
    billing: null,
    format: "americano",
    emailPrefix: "fx-fa-p",
    teamPrefix: "FA Squad",
  },
  {
    key: "fun-elimination",
    slug: "dev-fun-elim",
    name: "Dev Fun Match · Elimination",
    tournamentType: "fun_match",
    billing: null,
    format: "single_elimination",
    emailPrefix: "fx-fe-p",
    teamPrefix: "FE Squad",
  },
];
