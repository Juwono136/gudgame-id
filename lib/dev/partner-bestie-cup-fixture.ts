import "server-only";

import { and, count, eq, isNotNull, like } from "drizzle-orm";
import { getDb } from "@/db/client";
import { tournamentTeams } from "@/db/schema/tournament-registration";
import {
  partnerPlayers,
  partnerTournamentRegistrationMembers,
  partnerTournamentRegistrations,
} from "@/db/schema/partner-players";
import { tournamentPayments } from "@/db/schema/tournament-payments";
import { tournaments } from "@/db/schema/tournaments";
import { partnerPublicRoutes } from "@/lib/constants/routes";
import {
  buildBestieCupFixtureRoster,
  type BestieCupFixturePair,
} from "@/lib/dev/bestie-cup-fixture-roster";
import { upcomingBestieCupFixtureWindow } from "@/lib/dev/bestie-cup-fixture-schedule";
import { purgeTournamentsBySlugs } from "@/lib/dev/seed-tournament-fixtures";
import { getPartnerBySlug, ensurePartnerMembership } from "@/lib/partners/service";
import { upsertPartnerPlayer } from "@/lib/partners/registration/players";
import { PARTNER_FIXTURE_EMAIL_DOMAIN } from "@/lib/partners/registration/fixture-email";
import { confirmPartnerRegistration } from "@/lib/partners/registration/service";
import {
  generateAccessToken,
  hashAccessToken,
} from "@/lib/partners/registration/tokens";
import {
  BESTIE_CUP_TOTAL_PAIRS,
  bestieCupWizardDefaults,
  defaultBestieCupDoubleStageMatchScoring,
} from "@/lib/tournaments/partner/bestie-cup-config";
import {
  createTournament,
  getPartnerTournamentBySlug,
  updateTournament,
  type TournamentDetail,
} from "@/lib/tournaments/service";
import { tournamentUpsertSchema } from "@/lib/validations/tournaments";

export const BESTIE_CUP_FIXTURE_SLUG = "dev-bestie-cup-2026";
/** @deprecated Use PARTNER_FIXTURE_EMAIL_DOMAIN */
export const BESTIE_CUP_FIXTURE_EMAIL_DOMAIN = PARTNER_FIXTURE_EMAIL_DOMAIN;
export const BESTIE_CUP_FIXTURE_TOURNAMENT_NAME = "Bestie Cup 2026 · Dry Run";

/**
 * Partner Bestie Cup seed is **local development only** — never CI/staging/prod deploy.
 */
export function assertPartnerBestieCupLocalDevOnly(scriptLabel: string): void {
  if (process.env.GITHUB_ACTIONS === "true") {
    throw new Error(
      `${scriptLabel}: partner Bestie Cup dummy data is local-dev only and must not run in CI/deploy.`,
    );
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `${scriptLabel}: partner Bestie Cup dummy data is local-dev only (refused in production).`,
    );
  }
}

export type SeedPartnerBestieCupInput = {
  partnerSlug: string;
  creatorUserId: string;
  sport: { id: string; slug: string };
  reset?: boolean;
  goLive?: boolean;
  tournamentName?: string;
  tournamentSlug?: string;
};

export type SeedPartnerBestieCupResult = {
  tournament: TournamentDetail;
  partnerSlug: string;
  confirmedPairs: number;
  manageUrl: string;
  publicUrl: string;
  registerUrl: string;
  roster: BestieCupFixturePair[];
};

function fixturePlayerEmail(pairIndex: number, role: "captain" | "member"): string {
  const suffix = role === "captain" ? "c" : "m";
  return `bc2026-p${String(pairIndex).padStart(3, "0")}-${suffix}@${BESTIE_CUP_FIXTURE_EMAIL_DOMAIN}`;
}

function fixturePlayerPhone(pairIndex: number, role: "captain" | "member"): string {
  const base = 8100000000 + pairIndex * 10 + (role === "captain" ? 1 : 2);
  return String(base);
}

function buildTournamentPayload(input: {
  name: string;
  slug: string;
  status: "upcoming" | "live";
  startsAt: Date;
  endsAt: Date;
}) {
  const defaults = bestieCupWizardDefaults();
  const regOpen = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const regClose = new Date(input.startsAt.getTime() - 60 * 60 * 1000);
  const matchScoring = defaultBestieCupDoubleStageMatchScoring();

  const parsed = tournamentUpsertSchema.safeParse({
    name: input.name,
    slug: input.slug,
    summary:
      "Dev/staging dry-run for Bestie Cup 2026 (48 pairs · 16 pools · Bestie pool rules). Seeded via npm run db:seed:partner-bestie-cup.",
    description:
      "<p>Official reference: <strong>Bestie Cup 2026</strong> · Women's Doubles Low Bronze · Raara House Andara. Use manage → Groups for pool scoring and knockout advance tests.</p>",
    status: input.status,
    tournamentType: "fun_match",
    officialBilling: "free",
    registrationFeeIdr: 0,
    format: defaults.format,
    formatFamily: defaults.formatFamily,
    categoryLabel: "Female",
    venue: "Raara House Andara",
    maxTeams: defaults.maxTeams,
    playersPerTeam: 2,
    courtCount: defaults.courtCount,
    maxTeamsPerGroup: defaults.maxTeamsPerGroup,
    teamsAdvancePerGroup: defaults.teamsAdvancePerGroup,
    bestRunnerUpSlots: defaults.bestRunnerUpSlots,
    thirdPlaceEnabled: defaults.thirdPlaceEnabled,
    poolRules: defaults.poolRules,
    matchFormat: defaults.matchFormat,
    matchScoreMode: "games",
    raceToGames: 6,
    raceToGamesGroup: 6,
    raceToGamesKnockout: 6,
    gameDecider: "golden_point",
    scoringType: "points",
    pointsPerMatch: 21,
    allowDraw: false,
    winPoints: 1,
    drawPoints: 0,
    lossPoints: 0,
    scoreEntryMode: "live",
    matchScoring,
    partnerTenant: true,
    registrationOpensAt: regOpen.toISOString(),
    registrationClosesAt: regClose.toISOString(),
    startsAt: input.startsAt.toISOString(),
    endsAt: input.endsAt.toISOString(),
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid Bestie Cup fixture payload: ${JSON.stringify(parsed.error.flatten())}`,
    );
  }

  const { partnerTenant: _ignored, ...data } = parsed.data;
  return data;
}

async function seedConfirmedPair(input: {
  partnerId: string;
  tournamentId: string;
  pair: BestieCupFixturePair;
}): Promise<void> {
  const captain = await upsertPartnerPlayer(input.partnerId, {
    fullName: input.pair.player1,
    email: fixturePlayerEmail(input.pair.pairIndex, "captain"),
    phone: fixturePlayerPhone(input.pair.pairIndex, "captain"),
  });

  const member = await upsertPartnerPlayer(input.partnerId, {
    fullName: input.pair.player2,
    email: fixturePlayerEmail(input.pair.pairIndex, "member"),
    phone: fixturePlayerPhone(input.pair.pairIndex, "member"),
  });

  const accessTokenPlain = generateAccessToken();
  const db = getDb();

  const [registration] = await db
    .insert(partnerTournamentRegistrations)
    .values({
      tournamentId: input.tournamentId,
      partnerId: input.partnerId,
      status: "registered",
      teamName: input.pair.teamName,
      captainPartnerPlayerId: captain.id,
      feeIdr: null,
      accessTokenHash: hashAccessToken(accessTokenPlain),
      notes: `seed:bestie-cup-2026 pool=${input.pair.pool} pair=${input.pair.pairIndex}`,
    })
    .returning();

  if (!registration) {
    throw new Error(`Could not create registration for pair ${input.pair.pairIndex}`);
  }

  await db.insert(partnerTournamentRegistrationMembers).values([
    {
      registrationId: registration.id,
      partnerPlayerId: captain.id,
      fullName: captain.fullName,
      email: captain.email,
      phone: captain.phone,
      roleOrder: 0,
      isCaptain: true,
    },
    {
      registrationId: registration.id,
      partnerPlayerId: member.id,
      fullName: member.fullName,
      email: member.email,
      phone: member.phone,
      roleOrder: 1,
      isCaptain: false,
    },
  ]);

  await confirmPartnerRegistration(registration.id, { accessTokenPlain: null });
}

async function countConfirmedTeams(tournamentId: string): Promise<number> {
  const [row] = await getDb()
    .select({ value: count() })
    .from(tournamentTeams)
    .where(eq(tournamentTeams.tournamentId, tournamentId));
  return Number(row?.value ?? 0);
}

export async function seedPartnerBestieCupFixture(
  input: SeedPartnerBestieCupInput,
): Promise<SeedPartnerBestieCupResult> {
  assertPartnerBestieCupLocalDevOnly("seedPartnerBestieCupFixture");

  const partner = await getPartnerBySlug(input.partnerSlug.trim().toLowerCase());
  if (!partner) {
    throw new Error(
      `Partner "${input.partnerSlug}" not found. Check slug in partners table (e.g. spark-area).`,
    );
  }
  if (!partner.isActive) {
    throw new Error(`Partner "${input.partnerSlug}" is inactive.`);
  }

  await ensurePartnerMembership(partner.id, input.creatorUserId, "owner");

  const slug = input.tournamentSlug?.trim() || BESTIE_CUP_FIXTURE_SLUG;
  const name = input.tournamentName?.trim() || BESTIE_CUP_FIXTURE_TOURNAMENT_NAME;
  const roster = buildBestieCupFixtureRoster();

  if (input.reset) {
    await purgePartnerBestieCupFixture({
      sportId: input.sport.id,
      partnerId: partner.id,
      tournamentSlug: slug,
      purgeFixturePlayers: false,
    });
  }

  const existing = await getPartnerTournamentBySlug(
    partner.id,
    input.sport.slug,
    slug,
  );
  if (existing && !input.reset) {
    const teamTotal = await countConfirmedTeams(existing.id);
    return {
      tournament: existing,
      partnerSlug: partner.slug,
      confirmedPairs: teamTotal,
      manageUrl: partnerPublicRoutes.tournamentManage(partner.slug, existing.slug),
      publicUrl: partnerPublicRoutes.tournament(partner.slug, existing.slug),
      registerUrl: partnerPublicRoutes.tournamentRegister(partner.slug, existing.slug),
      roster,
    };
  }

  const { startsAt, endsAt } = upcomingBestieCupFixtureWindow();

  let tournament = await createTournament(
    input.sport.id,
    input.creatorUserId,
    buildTournamentPayload({
      name,
      slug,
      status: "upcoming",
      startsAt,
      endsAt,
    }),
    { partnerId: partner.id },
  );

  for (const pair of roster) {
    await seedConfirmedPair({
      partnerId: partner.id,
      tournamentId: tournament.id,
      pair,
    });
  }

  if (input.goLive) {
    const liveStarts = new Date();
    const liveEnds = new Date(Date.now() + 12 * 60 * 60 * 1000);
    tournament = await updateTournament(
      tournament.id,
      input.sport.id,
      buildTournamentPayload({
        name: tournament.name,
        slug: tournament.slug,
        status: "live",
        startsAt: liveStarts,
        endsAt: liveEnds,
      }),
    );
  }

  const refreshed =
    (await getPartnerTournamentBySlug(partner.id, input.sport.slug, slug)) ?? tournament;

  const teamTotal = await countConfirmedTeams(refreshed.id);
  if (teamTotal < BESTIE_CUP_TOTAL_PAIRS) {
    throw new Error(
      `Expected ${BESTIE_CUP_TOTAL_PAIRS} confirmed teams, got ${teamTotal}.`,
    );
  }

  return {
    tournament: refreshed,
    partnerSlug: partner.slug,
    confirmedPairs: teamTotal,
    manageUrl: partnerPublicRoutes.tournamentManage(partner.slug, refreshed.slug),
    publicUrl: partnerPublicRoutes.tournament(partner.slug, refreshed.slug),
    registerUrl: partnerPublicRoutes.tournamentRegister(partner.slug, refreshed.slug),
    roster,
  };
}

export async function purgePartnerBestieCupFixture(input: {
  sportId: string;
  partnerId: string;
  tournamentSlug?: string;
  purgeFixturePlayers?: boolean;
}): Promise<{
  removed: number;
  paymentsDeleted: number;
  fixturePlayersDeleted: number;
}> {
  const slug = input.tournamentSlug ?? BESTIE_CUP_FIXTURE_SLUG;
  const db = getDb();

  const [row] = await db
    .select({ id: tournaments.id })
    .from(tournaments)
    .where(
      and(
        eq(tournaments.sportId, input.sportId),
        eq(tournaments.slug, slug),
        eq(tournaments.partnerId, input.partnerId),
      ),
    )
    .limit(1);

  let paymentsDeleted = 0;
  if (row) {
    const deletedPayments = await db
      .delete(tournamentPayments)
      .where(eq(tournamentPayments.tournamentId, row.id))
      .returning({ id: tournamentPayments.id });
    paymentsDeleted = deletedPayments.length;
  }

  const { removed, paymentsDeleted: purgePayments } = await purgeTournamentsBySlugs({
    sportId: input.sportId,
    slugs: [slug],
  });

  let fixturePlayersDeleted = 0;
  if (input.purgeFixturePlayers) {
    const players = await db
      .select({ id: partnerPlayers.id })
      .from(partnerPlayers)
      .where(
        and(
          eq(partnerPlayers.partnerId, input.partnerId),
          like(partnerPlayers.email, `%@${BESTIE_CUP_FIXTURE_EMAIL_DOMAIN}`),
        ),
      );
    for (const player of players) {
      await db.delete(partnerPlayers).where(eq(partnerPlayers.id, player.id));
      fixturePlayersDeleted += 1;
    }
  }

  return {
    removed,
    paymentsDeleted: paymentsDeleted + purgePayments,
    fixturePlayersDeleted,
  };
}

/** Deploy safety: remove partner Bestie Cup dry-run events on every sport (slug + partnerId set). */
export async function purgeAllPartnerBestieCupFixtures(): Promise<{
  removed: number;
  paymentsDeleted: number;
}> {
  const db = getDb();
  const rows = await db
    .select({ sportId: tournaments.sportId, slug: tournaments.slug })
    .from(tournaments)
    .where(
      and(eq(tournaments.slug, BESTIE_CUP_FIXTURE_SLUG), isNotNull(tournaments.partnerId)),
    );

  let removed = 0;
  let paymentsDeleted = 0;
  const bySport = new Map<string, string[]>();
  for (const row of rows) {
    const list = bySport.get(row.sportId) ?? [];
    list.push(row.slug);
    bySport.set(row.sportId, list);
  }

  for (const [sportId, slugs] of bySport) {
    const result = await purgeTournamentsBySlugs({ sportId, slugs: [...new Set(slugs)] });
    removed += result.removed;
    paymentsDeleted += result.paymentsDeleted;
  }

  return { removed, paymentsDeleted };
}

/** Delete all dev-only partner_players created by the Bestie Cup seed (`*@bestie-fixture.local`). */
export async function deleteAllBestieCupFixturePartnerPlayers(): Promise<number> {
  const db = getDb();
  const players = await db
    .select({ id: partnerPlayers.id })
    .from(partnerPlayers)
    .where(like(partnerPlayers.email, `%@${PARTNER_FIXTURE_EMAIL_DOMAIN}`));

  for (const player of players) {
    await db.delete(partnerPlayers).where(eq(partnerPlayers.id, player.id));
  }

  return players.length;
}
