/**
 * One-time data migration for tournament tier overhaul.
 * Run: npx tsx scripts/migrate-tournament-tier-data.ts
 */
import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { playerMatches, playerTournamentResults } from "@/db/schema/player-competition";
import { tournamentAccessGrants } from "@/db/schema/tournament-invitations";
import { tournaments } from "@/db/schema/tournaments";
import { deriveStatsTier } from "@/lib/tournaments/stats/tier";
import { parseOfficialTournamentStaff } from "@/lib/tournaments/settings";

function hashCode(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function backfillStatsTier() {
  const db = getDb();
  const rows = await db
    .select({
      id: tournaments.id,
      tournamentType: tournaments.tournamentType,
      officialBilling: tournaments.officialBilling,
    })
    .from(tournaments);

  for (const row of rows) {
    const tier = deriveStatsTier({
      tournamentType: row.tournamentType,
      officialBilling: row.officialBilling,
    });

    await db
      .update(playerMatches)
      .set({ statsTier: tier })
      .where(eq(playerMatches.tournamentId, row.id));

    await db
      .update(playerTournamentResults)
      .set({ statsTier: tier })
      .where(eq(playerTournamentResults.tournamentId, row.id));
  }

  console.log(`Backfilled stats tier for ${rows.length} tournaments`);
}

async function migrateOfficialStaffJsonb() {
  const db = getDb();
  const rows = await db
    .select({
      id: tournaments.id,
      createdBy: tournaments.createdBy,
      settings: tournaments.settings,
    })
    .from(tournaments)
    .where(eq(tournaments.tournamentType, "official"));

  let migrated = 0;
  for (const row of rows) {
    const staff = parseOfficialTournamentStaff(
      (row.settings as Record<string, unknown> | null)?.officialStaff,
    );
    if (!staff?.length || !row.createdBy) continue;

    for (const member of staff) {
      const token = randomBytes(32).toString("hex");
      const code = randomBytes(4).toString("hex").toUpperCase();
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      await db.insert(tournamentAccessGrants).values({
        tournamentId: row.id,
        userId: member.userId,
        email: member.email,
        role: member.role === "host" ? "bracket_manager" : "scorekeeper",
        inviteCodeHash: hashCode(code),
        inviteToken: token,
        status: "accepted",
        expiresAt,
        invitedByUserId: row.createdBy,
        acceptedAt: new Date(member.invitedAt),
      });
      migrated += 1;
    }
  }

  console.log(`Migrated ${migrated} official staff records to access grants`);
}

async function main() {
  await getDb().execute(sql`SELECT 1`);
  await backfillStatsTier();
  await migrateOfficialStaffJsonb();
  console.log("Migration complete");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
