-- Restore gen_random_uuid() defaults on UUID PKs that lost them during
-- integer→UUID migrations (0004/0005). Without this, Drizzle inserts that
-- rely on DEFAULT (wiki player profiles, etc.) fail with NOT NULL on id.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
DECLARE
  t text;
BEGIN
  -- All app UUID PKs (0004/0005 lost defaults on several; baseline skips SQL).
  FOREACH t IN ARRAY ARRAY[
    'wiki_entities',
    'wiki_entity_relations',
    'wiki_entity_media',
    'wiki_scrape_hosts',
    'sports',
    'notifications',
    'host_bank_accounts',
    'host_payout_disbursements',
    'host_payout_disbursement_items',
    'host_role_requests',
    'tournaments',
    'tournament_teams',
    'tournament_team_members',
    'tournament_registrations',
    'tournament_payments',
    'tournament_reclub_matches',
    'tournament_bracket_matches',
    'tournament_courts',
    'tournament_groups',
    'tournament_group_teams',
    'tournament_group_matches',
    'tournament_access_grants',
    'tournament_player_invites',
    'tournament_archives',
    'match_score_revisions',
    'user_sport_interests',
    'partners',
    'partner_members',
    'partner_leagues',
    'partner_league_teams',
    'partner_league_matches',
    'partner_players',
    'partner_player_matches',
    'partner_player_tournament_results',
    'partner_tournament_registrations',
    'partner_tournament_registration_members',
    'partner_identities',
    'partner_identity_sessions',
    'partner_identity_verifications'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = t
        AND column_name = 'id'
        AND data_type = 'uuid'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN id SET DEFAULT gen_random_uuid()',
        t
      );
    END IF;
  END LOOP;
END $$;
