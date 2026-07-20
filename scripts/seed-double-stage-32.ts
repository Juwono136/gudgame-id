/**
 * Dev-only fixture: official free Double Stage tournament with 32 confirmed teams.
 *
 * NOT wired into CI/CD — run locally when testing the double-stage manage flow.
 *
 * Usage:
 *   npm run db:seed:double-stage -- --name juwonoindonesia@gmail.com
 *   npm run db:seed:double-stage -- --email=juwonoindonesia@gmail.com --reset
 *   npm run db:seed:double-stage -- --name you@example.com --go-live
 *
 * Note: npm requires `--` before script flags.
 *
 * Creator must already exist and will be granted `host` (kept with existing roles)
 * if they are not already `host` or `super_admin`.
 */
process.env.DB_SCRIPT_MODE = "true";

import "dotenv/config";
import { randomUUID } from "node:crypto";
import { and, eq, like } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { closeDatabase, getDb } from "@/db/client";
import { account, user } from "@/db/schema/auth";
import { sports } from "@/db/schema/sports";
import {
  tournamentRegistrations,
  tournamentTeamMembers,
  tournamentTeams,
} from "@/db/schema/tournament-registration";
import { publicSportRoutes } from "@/lib/constants/routes";
import {
  DOUBLE_STAGE_FIXTURE_SLUG,
  purgeDoubleStageFixture,
} from "@/lib/dev/purge-double-stage-fixture";
import { logger } from "@/lib/logger";
import type { AppRole } from "@/lib/roles/constants";
import { getUserRoleAssignments, setUserRoles } from "@/lib/roles/sync";
import {
  createTournament,
  getTournamentBySlug,
  updateTournament,
} from "@/lib/tournaments/service";
import { tournamentUpsertSchema } from "@/lib/validations/tournaments";

const log = logger.child({ script: "seed-double-stage-32" });

const TEAM_COUNT = 32;
const PLAYERS_PER_TEAM = 2;
const PLAYER_COUNT = TEAM_COUNT * PLAYERS_PER_TEAM;
const DEFAULT_SPORT_SLUG = "padel";
const DEFAULT_SLUG = DOUBLE_STAGE_FIXTURE_SLUG;
const DEFAULT_PASSWORD = "SeedPlayer1!";
const CREDENTIAL_PROVIDER_ID = "credential";
const EMAIL_DOMAIN = "gudgame.local";
const PLAYER_EMAIL_PREFIX = "ds32-p";

type CliOptions = {
  reset: boolean;
  goLive: boolean;
  sportSlug: string;
  tournamentSlug: string;
  /** Existing account that will own / create the tournament */
  creatorEmail: string | null;
};

function takeFlagValue(argv: string[], index: number, prefix: string): string | null {
  const arg = argv[index]!;
  if (arg.startsWith(`${prefix}=`)) {
    return arg.slice(prefix.length + 1).trim() || null;
  }
  if (arg === prefix) {
    return argv[index + 1]?.trim() || null;
  }
  return null;
}

function normalizeEnv(value: string | undefined): string {
  const trimmed = (value ?? "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    reset: false,
    goLive: false,
    sportSlug: DEFAULT_SPORT_SLUG,
    tournamentSlug: DEFAULT_SLUG,
    creatorEmail: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--reset") {
      opts.reset = true;
      continue;
    }
    if (arg === "--go-live") {
      opts.goLive = true;
      continue;
    }

    const sport = takeFlagValue(argv, i, "--sport");
    if (sport != null) {
      opts.sportSlug = sport || DEFAULT_SPORT_SLUG;
      if (arg === "--sport") i += 1;
      continue;
    }

    const slug = takeFlagValue(argv, i, "--slug");
    if (slug != null) {
      opts.tournamentSlug = slug || DEFAULT_SLUG;
      if (arg === "--slug") i += 1;
      continue;
    }

    // `--name` / `--email` both mean creator account email (as requested).
    const nameEmail = takeFlagValue(argv, i, "--name");
    if (nameEmail != null) {
      opts.creatorEmail = nameEmail.toLowerCase();
      if (arg === "--name") i += 1;
      continue;
    }
    const email = takeFlagValue(argv, i, "--email");
    if (email != null) {
      opts.creatorEmail = email.toLowerCase();
      if (arg === "--email") i += 1;
    }
  }

  if (!opts.creatorEmail) {
    opts.creatorEmail =
      normalizeEnv(process.env.SEED_DOUBLE_STAGE_HOST_EMAIL).toLowerCase() || null;
  }

  return opts;
}

function assertDevOnly(): void {
  if (process.env.GITHUB_ACTIONS === "true") {
    throw new Error(
      "Refusing to run: this seed is for local development only (not CI/CD).",
    );
  }

  if (
    process.env.NODE_ENV === "production" &&
    process.env.FORCE_DEV_SEED !== "true"
  ) {
    throw new Error(
      "Refusing to run in production. Set FORCE_DEV_SEED=true only if you intentionally want this fixture on a non-prod database.",
    );
  }
}

function playerEmail(index1Based: number): string {
  return `${PLAYER_EMAIL_PREFIX}${String(index1Based).padStart(3, "0")}@${EMAIL_DOMAIN}`;
}

function teamName(index1Based: number): string {
  return `DS32 Team ${String(index1Based).padStart(2, "0")}`;
}

function playerDisplayName(index1Based: number): string {
  return `DS32 Player ${String(index1Based).padStart(2, "0")}`;
}

function isOfficialCreatorRole(roles: AppRole[]): boolean {
  return roles.includes("host") || roles.includes("super_admin");
}

/**
 * Resolve an existing user as tournament creator.
 * Ensures they can create official tournaments (host or super_admin).
 */
async function resolveCreatorUser(email: string): Promise<{
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
      `[seed-double-stage] Granted host role to ${normalized} (roles: ${roles.join(", ")})`,
    );
  }

  if (!isOfficialCreatorRole(roles)) {
    throw new Error(
      `User "${normalized}" still lacks host/super_admin after role update.`,
    );
  }

  return { userId: existing.id, email: existing.email, roles };
}

async function ensureCredentialUser(input: {
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

async function resolveSport(sportSlug: string): Promise<{ id: string; slug: string }> {
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

async function ensurePlayers(password: string): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 1; i <= PLAYER_COUNT; i += 1) {
    const id = await ensureCredentialUser({
      email: playerEmail(i),
      name: playerDisplayName(i),
      password,
      roles: ["player"],
    });
    ids.push(id);
  }
  return ids;
}

async function insertConfirmedTeams(
  tournamentId: string,
  playerIds: string[],
): Promise<void> {
  const db = getDb();
  const now = new Date();

  for (let t = 0; t < TEAM_COUNT; t += 1) {
    const captainId = playerIds[t * 2]!;
    const memberId = playerIds[t * 2 + 1]!;
    const teamId = randomUUID();
    const registrationId = randomUUID();

    await db.insert(tournamentTeams).values({
      id: teamId,
      tournamentId,
      name: teamName(t + 1),
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
      tournamentId,
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

function buildUpsertInput(opts: {
  name: string;
  slug: string;
  status: "upcoming" | "live";
  startsAt: Date;
  endsAt: Date;
}) {
  const regOpen = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const regClose = new Date(opts.startsAt.getTime() - 60 * 60 * 1000);

  const parsed = tournamentUpsertSchema.safeParse({
    name: opts.name,
    slug: opts.slug,
    summary:
      "Dev fixture: official free Double Stage with 32 Mix teams (8 groups × 4). For local testing only.",
    description:
      "<p>Seeded by <code>npm run db:seed:double-stage</code>. Use the manage UI to score group matches and advance to knockout.</p>",
    status: opts.status,
    tournamentType: "official",
    officialBilling: "free",
    format: "double_stage",
    categoryLabel: "Mix",
    venue: "Gud Game Dev Courts",
    maxTeams: TEAM_COUNT,
    playersPerTeam: PLAYERS_PER_TEAM,
    courtCount: 4,
    maxTeamsPerGroup: 4,
    teamsAdvancePerGroup: 2,
    thirdPlaceEnabled: false,
    allowDraw: false,
    matchScoreMode: "games",
    raceToGames: 2,
    registrationOpensAt: regOpen.toISOString(),
    registrationClosesAt: regClose.toISOString(),
    startsAt: opts.startsAt.toISOString(),
    endsAt: opts.endsAt.toISOString(),
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid tournament payload: ${JSON.stringify(parsed.error.flatten())}`,
    );
  }

  return parsed.data;
}

async function main(): Promise<void> {
  assertDevOnly();

  const opts = parseArgs(process.argv.slice(2));
  if (!opts.creatorEmail) {
    throw new Error(
      "Creator email is required.\n" +
        "  npm run db:seed:double-stage -- --name juwonoindonesia@gmail.com",
    );
  }

  const password =
    normalizeEnv(process.env.SEED_DOUBLE_STAGE_PASSWORD) || DEFAULT_PASSWORD;

  console.log("[seed-double-stage] Starting fixture…");
  console.log(
    `[seed-double-stage] creator=${opts.creatorEmail} sport=${opts.sportSlug} slug=${opts.tournamentSlug} reset=${opts.reset} goLive=${opts.goLive}`,
  );

  const sport = await resolveSport(opts.sportSlug);
  const creator = await resolveCreatorUser(opts.creatorEmail);

  if (opts.reset) {
    const removed = await purgeDoubleStageFixture({
      sportId: sport.id,
      tournamentSlug: opts.tournamentSlug,
    });
    console.log(
      removed
        ? `[seed-double-stage] Removed existing tournament "${opts.tournamentSlug}"`
        : `[seed-double-stage] No existing tournament to reset`,
    );
  } else {
    const existing = await getTournamentBySlug(sport.slug, opts.tournamentSlug);
    if (existing) {
      console.log(
        `[seed-double-stage] Tournament already exists at ${publicSportRoutes.tournamentManage(sport.slug, existing.slug)}`,
      );
      console.log(
        "[seed-double-stage] Re-run with --reset to recreate, or: npm run db:seed:double-stage:purge",
      );

      if (opts.goLive && existing.status !== "live") {
        const detail = await getTournamentBySlug(sport.slug, opts.tournamentSlug);
        if (!detail) throw new Error("Tournament disappeared during go-live");
        const liveStarts = new Date();
        const liveEnds = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        await updateTournament(
          detail.id,
          sport.id,
          buildUpsertInput({
            name: detail.name,
            slug: detail.slug,
            status: "live",
            startsAt: liveStarts,
            endsAt: liveEnds,
          }),
        );
        console.log("[seed-double-stage] Existing tournament set to live (groups initialized).");
      }

      await closeDatabase();
      return;
    }
  }

  const playerIds = await ensurePlayers(password);
  console.log(`[seed-double-stage] Ensured ${playerIds.length} player accounts`);

  const startsAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const endsAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

  const created = await createTournament(
    sport.id,
    creator.userId,
    buildUpsertInput({
      name: "Dev Double Stage 32",
      slug: opts.tournamentSlug,
      status: "upcoming",
      startsAt,
      endsAt,
    }),
  );

  await insertConfirmedTeams(created.id, playerIds);
  console.log(
    `[seed-double-stage] Created tournament + ${TEAM_COUNT} confirmed teams (${PLAYER_COUNT} players)`,
  );

  let final = created;
  if (opts.goLive) {
    const liveStarts = new Date();
    const liveEnds = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    final = await updateTournament(
      created.id,
      sport.id,
      buildUpsertInput({
        name: created.name,
        slug: created.slug,
        status: "live",
        startsAt: liveStarts,
        endsAt: liveEnds,
      }),
    );
    console.log(
      "[seed-double-stage] Status → live; double-stage groups should now be initialized (8×4).",
    );
  }

  const manageUrl = publicSportRoutes.tournamentManage(sport.slug, final.slug);
  const publicUrl = publicSportRoutes.tournament(sport.slug, final.slug);

  console.log("");
  console.log("────────────────────────────────────────");
  console.log(" Double Stage fixture ready");
  console.log("────────────────────────────────────────");
  console.log(` Creator:       ${creator.email} (${creator.roles.join(", ")})`);
  console.log(` Player sample: ${playerEmail(1)} … ${playerEmail(PLAYER_COUNT)}`);
  console.log(` Player pass:   ${password}`);
  console.log(` Status:        ${final.status}`);
  console.log(` Manage:        ${manageUrl}`);
  console.log(` Public:        ${publicUrl}`);
  console.log(" Purge later:   npm run db:seed:double-stage:purge");
  console.log("────────────────────────────────────────");

  const leftover = await getDb()
    .select({ id: user.id })
    .from(user)
    .where(like(user.email, `${PLAYER_EMAIL_PREFIX}%@${EMAIL_DOMAIN}`));
  log.info("Seed complete", {
    tournamentId: final.id,
    creatorEmail: creator.email,
    playerAccounts: leftover.length,
    status: final.status,
  });

  await closeDatabase();
}

main().catch(async (err) => {
  log.error("Double-stage seed failed", err);
  console.error(
    "[seed-double-stage] Failed:",
    err instanceof Error ? err.message : String(err),
  );
  try {
    await closeDatabase();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
