# Reclub Free Tournament Workflow

Last updated: 2026-06-26

## Scope

This document covers the end-to-end flow for Turnament Reclub (gratis), represented in code as `tournamentType: "recreational"`.

Reclub sessions are free community play. They must not create tournament payment records and do not affect official rankings, although completed matches can sync brief history/stats.

## Entry Point

Create session:

- `/dashboard/host/tournaments/new/reclub`
- Page file: `app/dashboard/host/tournaments/new/reclub/page.tsx`
- Primary component: `components/dashboard/player/player-create-reclub-wizard.tsx`
- Wizard component: `components/tournaments/reclub/reclub-tournament-wizard.tsx`

Public session:

- `/sports/[sportSlug]/tournaments/[slug]`
- Page file: `app/sports/[sportSlug]/tournaments/[slug]/page.tsx`
- Router component: `components/tournaments/tournament-page-router.tsx`
- Reclub page component: `components/tournaments/reclub-tournament-page.tsx`

Lobby API:

- `/api/tournaments/[sportSlug]/[slug]/lobby`

## User Action

Creation:

1. Host opens the Reclub creation page.
2. Host selects sport, enters session name, summary, venue, and optional cover.
3. Host sets schedule, squad size, max squads, and max rounds.
4. Host adds optional description and house rules.
5. Host reviews and confirms creation.
6. App creates a `recreational` tournament and redirects to the host/public session target.

Participation:

1. Player opens the public Reclub session page.
2. Unauthenticated player is sent to register/login before joining.
3. Authenticated player joins the lobby.
4. Player is placed in an open squad or a new squad.
5. Player can create a named squad, switch squads, rename own squad if captain, or leave before the session ends.

Play:

1. Host opens the Lobby tab after session start time.
2. Host selects two squads and starts a round.
3. Squads are locked while a round is active.
4. Host updates live scores.
5. Host completes the round.
6. Completed round is saved to Reclub match history and synced to player history.

Optional bracket:

1. Host can generate a Reclub bracket from the Bracket tab.
2. Bracket match scoring uses the shared bracket APIs, with Reclub-specific playable-session checks.

## UI Component Sequence

Creation:

- `HostCreateReclubPage`
- `PageShell`
- `PlayerCreateReclubWizard`
- `ReclubTournamentWizard`
- `ReclubWizardStepper`
- `TournamentCoverUpload`
- `VenueAutocompleteField`
- `DateTimePicker`
- `RichTextEditor`
- `ReclubWizardReview`
- `ConfirmDialogProvider`
- `LoadingOverlay`

Public detail/lobby:

- `TournamentDetailPage`
- `TournamentPageRouter`
- `ReclubTournamentPage`
- `TournamentHeroBanner`
- `ReclubSessionStatusBanner`
- `TournamentShareCard`
- `ReclubLobbyDnd`
- `SquadCreateForm`
- `SquadNameEditor`
- `LiveScoreboard`
- `ReclubBracketPanel`
- `TournamentParticipantsPanel`
- `ReclubMatchHistoryPanel`
- `TournamentSessionStatsPanel`

Client hooks:

- `useTournamentLobby`
- `useSwitchTeam`
- `useCreateReclubTeam`
- `useRenameReclubTeam`
- `useLeaveReclubTournament`
- `useStartReclubRound`
- `useUpdateReclubLiveScore`
- `useCompleteReclubRound`
- `useGenerateReclubBracket`
- `useReclubSessionPhase`

## Validation

Creation validation:

- Frontend: `lib/tournaments/form/reclub-wizard-validation.ts`
- Backend: `lib/validations/tournaments.ts`
- Reclub payload uses:
  - `tournamentType: "recreational"`
  - `format: "open_play"`
  - `status: "upcoming"` on create
  - no registration fee
- Reclub sessions reject paid fees: `registrationFeeIdr > 0` is invalid.
- Start and end date/time are required.
- End time must be after start time.
- Players per team must be 1-12.
- Max squads must be 2-64 in the wizard.
- Max rounds must be 1-99.
- Name, summary, description, rules, venue, and maps URL use field length and URL checks.

Create API validation:

- `app/api/tournaments/create/route.ts`
- Extends `tournamentUpsertSchema` with `sportSlug`.
- Uses `assertCanCreateTournamentType`; Reclub creation requires a signed-in user with at least one role.
- Looks up sport by slug and rejects missing sport.

Join validation:

- `POST /api/tournaments/[sportSlug]/[slug]/join`
- Requires authenticated API role guard.
- Optional `teamName` max length 120.
- `joinReclubTournament` rejects non-recreational tournaments.
- `assertReclubSessionJoinable` rejects ended, draft, cancelled, or completed sessions.
- Existing member joins are idempotent and return the current team.

Squad validation:

- Create squad requires `teamName` length 2-120.
- Rename squad requires `name` length 2-120.
- Switch squad requires UUID `teamId`.
- Create/rename/switch are allowed only while the session is joinable.
- Switching and renaming are blocked during active Reclub rounds.
- Target squad must belong to the tournament.
- Target squad must not be full.
- Squad names are unique per tournament by `tournament_teams_name_uidx`.
- Rename is allowed only for host or squad captain.

Round validation:

- Start round requires host controls access.
- `teamAId` and `teamBId` must be valid UUIDs and different.
- `assertReclubSessionPlayable` requires session phase `live`.
- Only one Reclub round can be `in_progress`.
- Selected teams must belong to the tournament.
- Teams cannot be in active bracket matches.
- Max rounds from tournament settings is enforced.

Live score and completion validation:

- Live score requires host permission and an active match.
- Live score values are integers 0-99.
- Completion requires host permission and an active match.
- Completion score values are integers 0-999.
- Completion duration is 0-86400 seconds.
- Optional summary is max 500 characters.

## API/Server Action Call

No explicit Next.js server action is used. Mutations use App Router route handlers.

Create Reclub:

- Client: `ReclubTournamentWizard.handleSubmit`
- Hook: `useCreatePlayerReclubTournament`
- API: `POST /api/tournaments/create`
- Handler: `app/api/tournaments/create/route.ts`
- Service: `createTournament`
- Response: `{ tournament }`

Load public lobby:

- Hook: `useTournamentLobby`
- API: `GET /api/tournaments/[sportSlug]/[slug]/lobby`
- Handler: `app/api/tournaments/[sportSlug]/[slug]/lobby/route.ts`
- Services:
  - `getRegistrationSummary`
  - `listLobbyTeamsDetailed`
  - `listReclubMatches`
  - `getActiveReclubMatch`
  - `getUserTeamInTournament`
  - `getTeamsInActiveBracketMatches`

Join lobby:

- Client: `ReclubTournamentPage.handleJoin`
- API: `POST /api/tournaments/[sportSlug]/[slug]/join`
- Handler: `app/api/tournaments/[sportSlug]/[slug]/join/route.ts`
- Service: `joinReclubTournament`
- Response: `{ teamId }`

Create squad:

- Hook: `useCreateReclubTeam`
- API: `POST /api/tournaments/[sportSlug]/[slug]/teams/create`
- Service: `createNamedTeam`
- Response: `{ teamId }`

Switch squad:

- Hook: `useSwitchTeam`
- API: `POST /api/tournaments/[sportSlug]/[slug]/teams/switch`
- Service: `switchTeam`
- Response: `{ ok: true }`

Rename squad:

- Hook: `useRenameReclubTeam`
- API: `PATCH /api/tournaments/[sportSlug]/[slug]/teams/[teamId]`
- Service: `renameReclubTeam`
- Response: `{ renamed: true }`

Leave session:

- Hook: `useLeaveReclubTournament`
- API: `POST /api/tournaments/[sportSlug]/[slug]/leave`
- Service: `leaveReclubTournament`
- Response: `{ left: true }`

Start round:

- Hook: `useStartReclubRound`
- API: `POST /api/tournaments/[sportSlug]/[slug]/matches/start`
- Service: `startReclubRound`
- Response: `{ match }`

Live score:

- Hook: `useUpdateReclubLiveScore`
- API: `PATCH /api/tournaments/[sportSlug]/[slug]/matches/score`
- Service: `updateReclubLiveScore`
- Response: `{ match }`

Complete round:

- Hook: `useCompleteReclubRound`
- API: `POST /api/tournaments/[sportSlug]/[slug]/matches/complete`
- Service: `completeReclubRound`
- Response: `{ match }`

Match history:

- Component: `ReclubMatchHistoryPanel`
- API: `GET /api/tournaments/[sportSlug]/[slug]/matches`
- Service: `listReclubMatchesPaginated`

Bracket:

- Hook: `useGenerateReclubBracket`
- API: `POST /api/tournaments/[sportSlug]/[slug]/bracket/generate`
- Service: `generateTournamentBracket`
- Read API: `GET /api/tournaments/[sportSlug]/[slug]/bracket`

## Auth/Session Handling

Creation:

- `HostCreateReclubPage` calls `requireHostDashboardAccess()`.
- `POST /api/tournaments/create` calls `requireApiRoleGuardContext()`.
- Reclub type creation is allowed when roles length is greater than 0.

Public page:

- `TournamentPageRouter` calls `getServerSession()`.
- It derives `userId`, `isAuthenticated`, role assignments, `canManage`, and initial `userTeamId`.
- Unauthenticated users can view the public Reclub page and lobby data.

Lobby read:

- `GET /lobby` calls `getServerSession()` but does not require auth.
- If authenticated, it loads roles and current squad.
- Response includes `isAuthenticated`, `userId`, `userTeamId`, `canManage`, and participant context.

Mutations:

- Join, create team, switch team, rename team, leave, start round, score, complete, and bracket generation use `requireApiRoleGuardContext()`.
- Host controls use `canManageTournament` or `assertHostControlsAccess`.
- Live score and complete round are host-only.
- Join/switch/create/leave are player-authenticated actions, with service-level session phase checks.

## Database Interaction

Primary tables:

- `tournaments`
- `sports`
- `tournamentTeams`
- `tournamentTeamMembers`
- `tournamentRegistrations`
- `tournamentReclubMatches`
- `tournamentBracketMatches`
- `playerMatches`
- `playerTournamentResults`
- `user`

Creation phase:

- `createTournament` inserts into `tournaments`.
- For Reclub, `registrationFeeIdr` is stored as `null`.
- `settings` stores extended tournament settings such as max rounds and venue maps URL.
- After create, `syncReclubParticipation` records organizer participation/history context.

Join phase:

- If user is already in a team, service returns existing `teamId` and syncs participation.
- If an open team has room, insert `tournamentTeamMembers` with next `slotIndex`.
- If no open team exists, insert `tournamentTeams`, insert captain into `tournamentTeamMembers`, and insert `tournamentRegistrations` with status `confirmed`.
- Reclub registrations are confirmed immediately; no confirmation/payment lifecycle is used.

Squad phase:

- `createNamedTeam` inserts a new `tournamentTeams` row and optionally inserts the creator as captain if not already in a team.
- `switchTeam` deletes the user's current `tournamentTeamMembers` row and inserts a new one in the target team.
- `renameReclubTeam` updates `tournamentTeams.name`.
- `leaveReclubTournament` deletes the user's team member row, promotes the next captain if needed, clears bracket slots and deletes registration/team when the team becomes empty.

Match phase:

- `startReclubRound` inserts `tournamentReclubMatches` with status `in_progress`, round number, team names, player snapshots, and empty score events.
- `updateReclubLiveScore` updates score fields and appends score event metadata.
- `completeReclubRound` updates final score, duration, summary, status `completed`, `endedAt`, and `recordedByUserId`.
- Completion calls `syncReclubMatchToPlayerHistory` for participants.

Read phase:

- `listLobbyTeamsDetailed` joins teams, members, and users for lobby display.
- `getRegistrationSummary` counts Reclub teams and distinct members.
- `listReclubMatches` merges persisted Reclub rounds with session history.
- `computeReclubSessionStats` derives UI stats from matches and lobby data.

Payment:

- This workflow must not insert into `tournamentPayments`.
- Reclub creation rejects paid fees, and Reclub join has no checkout or provider webhook step.

## Response Handling

Creation:

- `useCreatePlayerReclubTournament` parses JSON with `parseJsonResponse`.
- On success, invalidates `host/tournaments` and `account/player/tournaments` query keys.
- Shows `toast.success("Reclub session created!")`.
- Redirects with `tournamentAfterCreateUrl(workspace, tournament)`.
- On failure, displays extracted API error in a toast.

Public page:

- `useTournamentLobby` refetches every 15 seconds normally and every 5 seconds when an active match exists.
- Lobby mutation success invalidates the lobby query and shows toast feedback.
- Join success refetches lobby, refreshes the router, and switches tab to `Lobby`.
- Leave success refetches, refreshes, and switches tab to `Overview`.
- Live score success updates React Query cache in place for the active match.
- Complete/start round success invalidates lobby data.

UI terminal states:

- Ended sessions hide join/start controls and show `getReclubSessionEndedMessage()`.
- Upcoming sessions block play and show `getReclubSessionNotLiveMessage()`.
- Active rounds show the live round banner and lock squad switching.

## Redirect/Navigation

Create navigation:

- Host starts at `/dashboard/host/tournaments/new/reclub`.
- Back link defaults to `/dashboard/host/tournaments` for host workspace.
- On successful host create, router pushes to the URL returned by `tournamentAfterCreateUrl`.

Public navigation:

- Public detail path is `/sports/[sportSlug]/tournaments/[slug]`.
- `TournamentPageRouter` sends `official` tournaments to `OfficialTournamentPage` and `recreational` tournaments to `ReclubTournamentPage`.
- Unauthenticated join action redirects to `/register?callbackUrl=/sports/[sportSlug]/tournaments/[slug]`.
- Join success stays on the public page and selects the `Lobby` tab.
- Leave success stays on the public page and selects the `Overview` tab.

## Error Handling

Frontend:

- Wizard validation returns step-specific toast errors.
- Create/update uses `LoadingOverlay`.
- Mutations show `toast.error(err.message)`.
- Join, leave, switch, start, and complete use confirmation dialogs.
- Lobby displays loading spinners while query data loads.

API:

- Route handlers catch exceptions and return `jsonError(error)`.
- Domain errors use `AppError`.
- Common status codes:
  - 400 for invalid tournament type/current operation.
  - 401 for unauthenticated guarded API calls.
  - 403 for ended sessions, not-live play attempts, or missing host controls.
  - 404 for missing tournament/team/match/user membership.
  - 409 for full teams, active round conflicts, duplicate squad names, or leaving during active play.
  - 422 for invalid request payloads.

Service-level consistency:

- Join is idempotent for existing members.
- Switching deletes old membership before inserting new membership.
- Leaving blocks if user's squad is in an active Reclub or bracket match.
- Empty teams are removed and bracket slots are cleared.
- Captain role is transferred when captain leaves a non-empty squad.
- Only one active Reclub round is allowed at a time.
- Round completion syncs player history after match row update.

## Files Involved

Pages:

- `app/dashboard/host/tournaments/new/reclub/page.tsx`
- `app/sports/[sportSlug]/tournaments/[slug]/page.tsx`
- `app/dashboard/tournaments/[id]/page.tsx`
- `app/dashboard/host/tournaments/[id]/edit/page.tsx`
- `app/admin/wiki-entities/tournaments/[id]/edit/page.tsx`

Components:

- `components/dashboard/player/player-create-reclub-wizard.tsx`
- `components/tournaments/reclub/reclub-tournament-wizard.tsx`
- `components/tournaments/reclub/reclub-wizard-stepper.tsx`
- `components/tournaments/reclub/reclub-wizard-review.tsx`
- `components/tournaments/reclub/reclub-session-status-banner.tsx`
- `components/tournaments/reclub/squad-create-form.tsx`
- `components/tournaments/reclub/squad-name-editor.tsx`
- `components/tournaments/tournament-page-router.tsx`
- `components/tournaments/reclub-tournament-page.tsx`
- `components/tournaments/reclub-lobby-dnd.tsx`
- `components/tournaments/live-scoreboard.tsx`
- `components/tournaments/reclub-bracket-panel.tsx`
- `components/tournaments/reclub-match-history.tsx`
- `components/tournaments/tournament-session-stats-panel.tsx`
- `components/dashboard/host/workspace/host-reclub-lobby-panel.tsx`
- `components/dashboard/player/player-tournament-workspace.tsx`

Hooks:

- `hooks/use-host-tournaments.ts`
- `hooks/use-tournament-lobby.ts`
- `hooks/use-tournament-bracket.ts`
- `hooks/use-reclub-session-phase.ts`

API routes:

- `app/api/tournaments/create/route.ts`
- `app/api/tournaments/[sportSlug]/[slug]/lobby/route.ts`
- `app/api/tournaments/[sportSlug]/[slug]/join/route.ts`
- `app/api/tournaments/[sportSlug]/[slug]/leave/route.ts`
- `app/api/tournaments/[sportSlug]/[slug]/teams/create/route.ts`
- `app/api/tournaments/[sportSlug]/[slug]/teams/switch/route.ts`
- `app/api/tournaments/[sportSlug]/[slug]/teams/[teamId]/route.ts`
- `app/api/tournaments/[sportSlug]/[slug]/matches/route.ts`
- `app/api/tournaments/[sportSlug]/[slug]/matches/start/route.ts`
- `app/api/tournaments/[sportSlug]/[slug]/matches/score/route.ts`
- `app/api/tournaments/[sportSlug]/[slug]/matches/complete/route.ts`
- `app/api/tournaments/[sportSlug]/[slug]/bracket/route.ts`
- `app/api/tournaments/[sportSlug]/[slug]/bracket/generate/route.ts`
- `app/api/tournaments/[sportSlug]/[slug]/bracket/live/route.ts`
- `app/api/tournaments/[sportSlug]/[slug]/bracket/score/route.ts`
- `app/api/tournaments/[sportSlug]/[slug]/bracket/assign/route.ts`

Services:

- `lib/tournaments/service.ts`
- `lib/tournaments/registration/service.ts`
- `lib/tournaments/reclub/teams.ts`
- `lib/tournaments/reclub/leave.ts`
- `lib/tournaments/reclub/matches.ts`
- `lib/tournaments/reclub/live-score.ts`
- `lib/tournaments/reclub/session-lifecycle.ts`
- `lib/tournaments/reclub/session-guard.ts`
- `lib/tournaments/reclub/squad-names.ts`
- `lib/tournaments/reclub/match-mapper.ts`
- `lib/tournaments/reclub/session-history.ts`
- `lib/tournaments/brackets/*`
- `lib/tournaments/stats/sync.ts`
- `lib/tournaments/stats/from-reclub.ts`
- `lib/tournaments/participant-access.ts`
- `lib/tournaments/permissions.ts`
- `lib/tournaments/settings.ts`

Validation/schema:

- `lib/tournaments/form/reclub-wizard-validation.ts`
- `lib/validations/tournaments.ts`
- `db/schema/tournaments.ts`
- `db/schema/tournament-registration.ts`
- `db/schema/tournament-matches.ts`

## Risk If Modified

High risk:

- Allowing fees on Reclub can accidentally create paid/free hybrid behavior.
- Changing session phase logic can allow joins or rounds after the session ended.
- Changing team switch/leave behavior can orphan members, teams, registrations, or bracket slots.
- Relaxing host checks can let non-host users start/complete rounds or edit live scores.
- Changing active-round locking can corrupt match participants while scores are in progress.
- Changing match completion sync can duplicate or miss player history rows.
- Changing bracket integration can leave teams in active bracket and lobby matches simultaneously.

Medium risk:

- Changing React Query keys can leave lobby stale after mutations.
- Changing max squads/players validation can cause database slot uniqueness conflicts.
- Changing public page routing can show official UI for Reclub or vice versa.
- Changing creator/role logic can hide host controls from session owner.

Low risk:

- Copy-only UI changes that do not alter route paths, query keys, permission checks, status checks, or mutation payloads.

## Recommended Tests

Creation:

- Reclub create succeeds with valid name, sport, schedule, players per team, max teams, and max rounds.
- Reclub create rejects `registrationFeeIdr > 0`.
- Reclub create rejects missing start/end date.
- Reclub create rejects end time before start time.
- Unauthenticated/no-role user cannot create Reclub through API.
- Created Reclub stores `registrationFeeIdr` as null and syncs organizer participation.

Join/lobby:

- Public Reclub page renders for live sport and non-draft recreational tournament.
- Unauthenticated join redirects to register with callback URL.
- Authenticated join creates team/member/registration when no open team exists.
- Authenticated join fills an open team when capacity allows.
- Existing member join is idempotent.
- Ended session rejects join/create/switch/leave.
- Lobby response includes summary, teams, matches, activeMatch, userTeamId, canManage, participant context, and active bracket team IDs.

Squads:

- Create named squad respects maxTeams.
- Duplicate squad name returns conflict.
- Switch squad rejects full target team.
- Switch squad rejects active round.
- Rename allowed for host and squad captain.
- Rename rejected for non-captain participant.
- Leave removes member, promotes next captain, deletes empty team, deletes registration, and clears bracket slots.
- Leave rejects active Reclub or bracket match involving user's squad.

Rounds:

- Host can start round only during live session phase.
- Non-host cannot start, score, or complete round.
- Start rejects same team on both sides.
- Start rejects when another round is already active.
- Start respects maxRounds.
- Start rejects teams in active bracket matches.
- Live score updates active match and appends score event metadata.
- Complete round writes final score/duration/summary, marks completed, and syncs player history.

UI:

- Wizard stepper blocks moving forward on invalid step data.
- Reclub page shows join CTA, lobby tab, ended/upcoming/live banners correctly.
- Lobby refetches every 15 seconds normally and 5 seconds during active match.
- Mutation success invalidates lobby and shows expected toast.
- Live score cache updates without waiting for full refetch.

Regression:

- Reclub flow never creates `tournamentPayments`.
- Official paid registration flow still rejects Reclub join endpoints.
- Public participant count matches distinct lobby members.
- Match history shows completed Reclub rounds and supports pagination/search/status filters.
