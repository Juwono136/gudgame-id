# Gud Game — User Manual

| | |
| --- | --- |
| **Document** | Complete end-user manual |
| **Product** | **Gud Game** |
| **Website** | [https://gudgame.id](https://gudgame.id) |
| **Audience** | Players, spectators, tournament hosts, partner staff, and first-time visitors |
| **UI language** | English (button and menu labels match the app) |
| **Manual language** | English |
| **Version** | 2026-10-16 |

> **How to use this document.** Start at [Section 1](#1-welcome-to-gud-game) if you are new. Jump to the section for your role via the [table of contents](#table-of-contents). Text in **bold like this** usually matches on-screen buttons or menus.
>
> Deeper match-day / technical ops: [tournament-guide.md](./tournament-guide.md) · Partner auth: [partner-auth.md](./partner-auth.md) · Full docs index: [README.md](./README.md).

---

## Table of contents

1. [Welcome to Gud Game](#1-welcome-to-gud-game)
2. [Getting ready & creating an account](#2-getting-ready--creating-an-account)
3. [Sign in, email verification, & forgot password](#3-sign-in-email-verification--forgot-password)
4. [Completing your profile for the first time](#4-completing-your-profile-for-the-first-time)
5. [Home page & navigation](#5-home-page--navigation)
6. [Sport hub, wiki, & search](#6-sport-hub-wiki--search)
7. [Player dashboard](#7-player-dashboard)
8. [Browsing & joining Official tournaments](#8-browsing--joining-official-tournaments)
9. [Fun Match (community sessions)](#9-fun-match-community-sessions)
10. [Registration payments](#10-registration-payments)
11. [Becoming a Host & creating tournaments](#11-becoming-a-host--creating-tournaments)
12. [Match day: Manage & TV Display](#12-match-day-manage--tv-display)
13. [Partner sites (white-label)](#13-partner-sites-white-label)
14. [Settings, roles, & notifications](#14-settings-roles--notifications)
15. [Super Admin role (brief)](#15-super-admin-role-brief)
16. [FAQ & troubleshooting](#16-faq--troubleshooting)
17. [Glossary](#17-glossary)

---

# 1. Welcome to Gud Game

## 1.1 What is Gud Game?

**Gud Game** is a court-sports platform, starting with **padel**. In one place you can:

- Discover tournaments, live scores, and venue TV boards  
- Manage a player profile and match history  
- Browse a sports wiki (players, teams, gear, rules)  
- Pay tournament registration fees online  
- Run events as a **Host**, or play on a branded **Partner** site  

Product tagline: *Your home for court sports — tournaments, live scores, player profiles, wiki, and community.*

## 1.2 Who uses Gud Game?

| Role | Who it is for | What they can do |
| --- | --- | --- |
| **Visitor** | No account yet | Browse home, sport hubs, wiki, tournament lists, TV display |
| **Player** | Community members | Create an account, complete a profile, enter tournaments, join Fun Matches, view payments |
| **Host** | Gud Game event organizers | Create Official / Fun Match events, manage scores & brackets, receive payouts |
| **Partner member** | Players on a partner brand site | Sign in only at `gudgame.id/{partner-name}` (separate from Gud Game accounts) |
| **Partner staff** | Partner brand admins | Manage partner tournaments & leagues via the **Partner console** (using a Gud Game account) |
| **Super Admin** | Platform team | Master Console (`/admin`) — not for general users |

One person can hold more than one role (for example Player + Host). You switch workspaces from the dashboard menus.

## 1.3 What you need

- A modern browser (Chrome, Edge, Firefox, Safari)  
- A stable internet connection (important for live scores and TV)  
- An active email address (verification and password reset)  
- A phone / WhatsApp number (recommended when completing your profile)  
- For paid tournaments: a supported payment method (QRIS, bank transfer, e-wallet, card)

## 1.4 Language note

The application UI is in **English**. This manual is also in **English**, and button names match the screens (for example **Sign In**, **Register team**, **Save profile**).

---

# 2. Getting ready & creating an account

## 2.1 Open the site

1. Go to [https://gudgame.id](https://gudgame.id).  
2. In the navigation you will see **LOGIN** and **CONTRIBUTE** (create an account).

## 2.2 Sign up with email & password

1. Click **CONTRIBUTE**, or open `/register`.  
2. On **Create Account**, fill in:  
   - **Email** (required)  
   - **Phone (optional)**  
   - **Password**  
   - **Confirm password**  
3. Click **Create Account**.  
4. You are sent to **Check your inbox** — open the email and click the verification link.

> Use a strong password. Do not share it with anyone, including people claiming to be “committee staff” outside official Gud Game channels.

## 2.3 Sign up with Google

1. On **Create Account**, click **Sign up with Google**.  
2. Choose your Google account and approve the requested access.  
3. When done, complete your profile if prompted.

The Google button only appears when Google sign-in is enabled on the server. If you do not see it, use email/password.

## 2.4 Partner accounts vs Gud Game accounts

| Account type | Where you use it | Important |
| --- | --- | --- |
| **Gud Game** account | `gudgame.id` (login, player/host/partner-staff dashboards) | One platform identity |
| **Partner member** account | Only on `gudgame.id/{partnerSlug}` | **Separate** — the same email does not automatically log you into Gud Game |

If you join an event on a brand site (for example a partner cup), register on that partner site. See [Section 13](#13-partner-sites-white-label).

---

# 3. Sign in, email verification, & forgot password

## 3.1 Sign In

1. Click **LOGIN** or open `/login`.  
2. On **Welcome Back**:  
   - Enter **Email Address** and **Password**, then **Sign In**, **or**  
   - **Continue with Google**.  
3. After success, you land on your dashboard (or the page you were trying to open).

## 3.2 Email not verified yet

If you see a warning that your email is not verified:

1. Click **Resend verification email**.  
2. Check your inbox (and spam folder).  
3. Open the link → **Email verified** → **Sign In** again.

Other statuses you may see:

| On-screen message | Meaning | What to do |
| --- | --- | --- |
| **Email verified** | Success | Continue to Sign In |
| **Link expired** | Link timed out | Resend / Sign In then resend |
| **Invalid verification link** | Broken or already used | Request a new email |

## 3.3 Forgot password

1. On the login page, click **Forgot password?**.  
2. Enter your email → **Send reset link**.  
3. Open the email → **Set a new password**.  
4. Enter **New password** and **Confirm new password** → **Update password**.  
5. Sign in again with the new password.

## 3.4 Log out

Open the user menu (avatar / icon in the nav) → **Log out**.

---

# 4. Completing your profile for the first time

After a new account is created, you are usually sent to **`/dashboard/complete-profile`** (**Personalize your game**).

## 4.1 Fields you will typically see

| On screen | Meaning |
| --- | --- |
| **Profile photo** | Avatar (optional, recommended) |
| **Full name (as shown on ID)** | Legal full name |
| **Phone / WhatsApp number** | Contact for organizers / teammates |
| **Gender** | Profile data |
| **Sports you follow** | Pick at least one sport |
| **Nickname** | Community display name (when available) |

The **Progress** indicator shows how complete your profile is. Highlighted chips mark missing pieces.

## 4.2 Saving

1. Fill in the required fields.  
2. Click **Save profile**.  
3. You return to the **Player Dashboard** (`/dashboard`).

You can update this anytime under **Settings** (see [Section 14](#14-settings-roles--notifications)).

> A complete profile helps organizers reach you and makes your public player page more useful.

---

# 5. Home page & navigation

## 5.1 Main navigation

Public navigation usually includes:

| Menu | Purpose |
| --- | --- |
| **Home** | Landing page |
| **About** | About Gud Game |
| **Contact Us** | Contact |
| **Search** box | Find players, gear, tournaments, news |
| **LOGIN** / user menu | Sign in or open dashboards |

## 5.2 After login — user menu

Typical items:

- **Player Dashboard** — player workspace  
- **My Settings** — account settings  
- **Log out**

If you have Host or Partner roles, those dashboards are available from their own areas.

## 5.3 Notifications (bell)

When signed in, the **Notifications** bell:

- Opens your notification list  
- Offers **Mark all read**  
- Shows **No notifications yet.** when empty  

Examples: Host request decisions, payment updates, tournament invites.

---

# 6. Sport hub, wiki, & search

## 6.1 Sport hub (padel example)

Open `/sports/padel` (or another available sport).

Typical shortcuts:

| Shortcut | Content |
| --- | --- |
| **Tournaments** | Event list |
| **Players** / **Players & rankings** | Players and rankings |
| **Equipment** / **Gear & Tools** | Equipment |
| **Rules** | Sport rules |

Which modules appear can differ by sport.

## 6.2 Public tournament list & detail

1. Open **Tournaments**.  
2. Filter by **All** / **Live** / **Upcoming** / **Completed**.  
3. Open an event for schedule, venue, format, fees, and registration actions.

## 6.3 Wiki: players, teams, gear

| Page | Example URL | Purpose |
| --- | --- | --- |
| Player list | `/sports/padel/players` | Browse / rankings |
| Player wiki page | `/sports/padel/players/...` | Public bio |
| Teams | `/sports/padel/teams` | Team encyclopedia |
| Gear | `/sports/padel/gear` | Equipment & tools |
| Rules | `/sports/padel/rules` | Rules content |

## 6.4 Global search

1. Type in the search box (placeholder like **Search players, gear, tournaments, news…**), or open `/search`.  
2. Results are grouped (for example **Players**, **Gear**, **Tournaments**, **News**).  
3. Click a result to open its page.

---

# 7. Player dashboard

Open **Player Dashboard** at `/dashboard`.

## 7.1 Dashboard navigation

| Menu | Content |
| --- | --- |
| **Overview** | Summary, bio, stats, recent matches |
| **Tournaments** (on mobile sometimes **Events**) | Events you joined / Fun Matches you create |
| **Payments** | Payment history |
| **Settings** | Profile, security, appearance, Host request |

## 7.2 Common Overview shortcuts

- **My sessions** / **Match history** — play history  
- **Create Fun Match** — create a community session (when allowed for players)  
- **Settings** — complete or edit your profile  

If your profile is incomplete, a reminder banner stays until you finish **complete-profile**.

## 7.3 Player payments page

Under **Payments** you can:

- See registration payment statuses  
- Open receipts from your payment history  

---

# 8. Browsing & joining Official tournaments

**Official** tournaments are Gud Game’s formal events. They can be **Paid** or **Free**. Results may affect ranking/career (except No Rank / host policy).

## 8.1 Player happy path

```text
Find tournament → Open detail → Register team
      → (if paid) Confirm → Checkout → pay
      → Registration successful
```

## 8.2 Before you register

- You are **Signed In** with a Gud Game account  
- Profile is complete enough (name & contact)  
- Registration window is still open  
- Team slots remain  
- You meet eligibility (Male / Female / Mix category, skill tier if applied)

If you are not signed in, the page usually shows **Sign up to register**.

## 8.3 Registering a team

1. On the tournament page, click **Register team**.  
2. You enter the **Register your team** wizard (`…/register`).  
3. Fill what is asked, for example:  
   - **Team name** (for doubles / team formats)  
   - **Captain** (usually you)  
   - Teammates via **Search**, **Invite email**, or **Solo / skip** when allowed  
4. Check the fee summary: **Free** or an IDR amount.  
5. Continue:  
   - Paid → **Continue to payment**  
   - Free → **Confirm registration**

## 8.4 Confirm & checkout (paid)

1. **Step 1 of 2 — Confirm participation** → **Confirm & continue to payment**.  
2. **Choose payment method** / **Complete your payment**.  
3. Pick a method (see [Section 10](#10-registration-payments)).  
4. Finish on the payment gateway page.  
5. Return to Gud Game → **Registration successful** or **Payment complete**.

Statuses you may see on the tournament page:

| Badge / CTA | Meaning |
| --- | --- |
| **You're registered** | Registration complete |
| **Payment pending** | Waiting for payment |
| **Confirm participation** | Next confirmation step needed |
| **Continue to checkout** | Resume payment |

## 8.5 Claiming a teammate invite

If the captain invited you by email, open the **claim** link and follow the screen. Sign in with the invited email when asked.

## 8.6 Tournament formats (player view)

Hosts choose the format. As a player, it helps to know:

| Format (examples) | What it feels like |
| --- | --- |
| **Elimination** | Knockout; lose and you are out (unless extra brackets exist) |
| **Double Stage** | Groups first, then knockout |
| **Group only** | Groups / standings only |
| **Americano** | Rotating partners; points per individual |
| **Mexicano** | Rounds built from the leaderboard |
| **Swiss / Modified Swiss** | Pairings by record (common on some partner events) |

Scoring & ranking detail for operators: [tournament-guide.md](./tournament-guide.md).

---

# 9. Fun Match (community sessions)

**Fun Match** is casual / community play. It does **not** affect Gud Game Official ranking.

## 9.1 Joining a Fun Match as a player

1. Open the Fun Match public page.  
2. Click **Join lobby** (or **Sign up to join** if you are not signed in).  
3. Follow the on-screen lobby / session steps.  

Fun Match does not use the Official paid checkout flow.

## 9.2 Creating a Fun Match (player / host)

- Player: often via `/dashboard/tournaments/new` or **Create Fun Match**.  
- Host: `/dashboard/host/tournaments/new` → choose **Fun Match**.

Fun Match forms are simpler (no Official ranking category). Common formats: **Americano** or **Elimination**.

> Timed Fun Match sessions may be hard-stopped by the system so courts are not held forever.

---

# 10. Registration payments

## 10.1 Common methods

At checkout you choose one (depending on gateway configuration):

| On-screen method | Notes |
| --- | --- |
| **QRIS** | Scan with bank / e-wallet apps |
| **Bank transfer** | Virtual account / bank transfer |
| **E-Wallet** | OVO, DANA, ShopeePay, LinkAja, etc. |
| **Credit / debit card** | Cards supported by the gateway |

Amounts are shown in **Indonesian Rupiah (IDR)**.

## 10.2 Tips for a successful payment

1. Do not close the tab until success appears.  
2. Keep proof / open **Payment history** in your dashboard.  
3. If status stays **Payment pending**, check email & notifications; refresh the tournament page.  
4. Do not pay twice for the same registration unless the host clearly asks you to.  
5. Gateway issues (balance, bank limits) are fixed in your payment app, then return to Gud Game.

## 10.3 Receipts

After success, open the receipt from **Payments** on the player dashboard (or from the checkout success link).

---

# 11. Becoming a Host & creating tournaments

## 11.1 Player vs Host

| | Player | Host |
| --- | --- | --- |
| Join tournaments | Yes | Yes |
| Create Fun Match | Yes (limited) | Yes |
| Create **Official** tournaments | No (locked) | Yes |
| Manage scores / brackets on match day | If invited as staff | Yes (event owner) |
| Host payouts | No | Yes |

## 11.2 Requesting the Host role

1. Open **Settings** → **Roles** tab (`/dashboard/settings#roles`).  
2. On **Request Host role**, optionally fill **Message to super admin**.  
3. Confirm **Submit request**.  
4. Status becomes **Request pending review**.  
5. When approved, you see **Host access granted** → **Open Host dashboard**.

You may also get a notification / email. Super Admins approve requests under **Host requests**.

## 11.3 Host Dashboard

Open `/dashboard/host`.

| Menu | Purpose |
| --- | --- |
| **Overview** | Host summary |
| **Tournaments** | Events you manage |
| **Payments & payout** | Incoming payments & payout setup |
| **Settings** | Account settings in the host workspace |

Common shortcuts: **My tournaments**, **Create tournament**, **Payments & payout**, **Settings**.

## 11.4 Creating an Official tournament

1. **Create tournament** → choose **Official tournament**.  
2. Complete the wizard (name, schedule, venue, category, format, capacity, banner, description, fee if Paid, etc.).  
3. Save / publish (start as **Draft** while testing).  
4. Share the public URL:  
   `/sports/{sport}/tournaments/{slug}`  
5. Operate the event from **Manage**.

If you are not a Host yet, you may see **Host role required for Official tournaments**.

## 11.5 Checklist before publishing Official

- [ ] Clear name & slug  
- [ ] Start / end dates and registration window are correct  
- [ ] Category (Male / Female / Mix) is correct  
- [ ] Format & capacity fit available courts  
- [ ] Fee (if Paid) is greater than 0 and payment was tested  
- [ ] Rules / description are clear for players  
- [ ] Cover image uploaded (optional but recommended)

Field-by-field ops guide: [tournament-guide.md](./tournament-guide.md) (Part B).

## 11.6 Host payouts (brief)

Under **Payments & payout**, Hosts can:

- Review registration funds for their events  
- Connect platform payment accounts (Xendit / XenPlatform as configured)  
- Save bank details for disbursement  

Automated payouts run on the server schedule. Confirm bank details before running paid events.

---

# 12. Match day: Manage & TV Display

This section is for Hosts / court staff. Regular players usually only watch scores on the public page or TV.

## 12.1 Opening Manage

For an event you control, open:

`/sports/{sport}/tournaments/{slug}/manage`

Or use the **Manage** control in the tournament session chrome.

### Important sections

| Section | Used for |
| --- | --- |
| **Dashboard** | Match-day overview |
| **Registrations** | Check / confirm entries |
| **Players** | Roster |
| **Groups** | Group stage (Double Stage / Group only) |
| **Match Schedule** | Schedule & courts |
| **Live scoring** | Enter scores |
| **Bracket** | Knockout bracket |
| **Invites** | Invite staff (time-limited links/codes) |
| **Display** | Configure the TV board |

Typical match-day flow:

```text
Dashboard → Registrations → Groups / Schedule
→ Live scoring → Bracket → Display (TV)
```

## 12.2 Live scoring

1. Ensure the tournament status is **Live**.  
2. Open **Live scoring**.  
3. Enter scores only from the manage device (organizer tablet/laptop).  
4. Public pages and TVs update through periodic refresh (polling).  

If a score is wrong, use the manage revision/override flow (changes are usually logged).

## 12.3 TV / Live Display

1. In Manage → **Display**, pick a layout, for example:  
   - **Featured court**  
   - **Multi-court grid**  
   - **Live bracket**  
   - **Leaderboard**  
   - **Group stage live**  
   - **Match schedule**  
2. On the TV machine, open the **Display** URL:  
   `/sports/{sport}/tournaments/{slug}/display`  
3. Enter browser fullscreen.  
4. Disable sleep / screensaver on the TV device.

| Do | Avoid |
| --- | --- |
| Dedicate one device to the TV | Using the TV as a scoring input |
| Keep Wi-Fi stable | Opening heavy tabs on the TV |
| Test display the day before | Changing the URL mid-event without checking |

More detail: [tv-display.md](./tv-display.md).

## 12.4 Inviting court staff

1. Manage → **Invites**.  
2. Create an invite and share the link or code.  
3. Staff open the invite URL and follow the screen.  
4. Authorized staff can help manage according to the invite permissions.

---

# 13. Partner sites (white-label)

Some communities/brands run Gud Game under their own look and feel, for example:

`https://gudgame.id/{partnerSlug}`

Partner public footers usually show **Powered by Gud Game**.

## 13.1 Partner members (players on a brand site)

### Sign up

1. Open the partner site → **Create member account** (`/{partnerSlug}/signup`).  
2. Enter Full name, Email, Phone, Password — or **Sign up with Google**.  
3. Verify email through the partner **check-email** / **verify-email** flow.

### Sign in

1. `/{partnerSlug}/login` → **Member sign in**.  
2. Or **Sign in with Google**.  

> This is **not** the main Gud Game login. A member account does not open the Gud Game `/dashboard`.

### My account

`/{partnerSlug}/account` → **My account** for partner-scoped profile data.

### Joining partner tournaments

The flow is similar to Official (register → pay if paid → success), but under partner URLs. Guests can also be registered with claimable contact details, depending on the event settings.

Partner stats are **not** mixed into Gud Game Official rankings.

## 13.2 Partner staff (owner / staff)

1. Sign in to Gud Game at `/login` with an account that has the **partner** role.  
2. Open the **Partner console** at `/dashboard/partner`.  
3. Common shortcuts:  
   - **New tournament** / **All tournaments**  
   - **New league** / **All leagues**  
   - **Players**  
   - **Payments**  
   - **Branding**  
   - **Open public site**  

On the partner login page, staff see a link such as **Sign in with Gud Game (Partner Console)** so they do not use the member form by mistake.

Deep auth manual: [partner-auth.md](./partner-auth.md).  
Example partner event: [bestie-cup-guide.md](./bestie-cup-guide.md).

## 13.3 Partner leagues

Staff can create a **league** to group tournaments (season/brand) and show standings. Partner leagues are lighter than the Gud Game Official career + TV path.

---

# 14. Settings, roles, & notifications

Open **Settings** at `/dashboard/settings` (or `/dashboard/host/settings` from the host workspace).

## 14.1 Settings tabs

| Tab | Content |
| --- | --- |
| **Profile** | Name, photo, phone; account info (email, roles, nickname) |
| **Player page** | Public page fields (nationality, age, tagline, bio, equipment, socials) |
| **Roles** | View roles; **Request Host role** |
| **Security** | **Update password** or **Create password** (for Google-only accounts) |
| **Appearance** | **Light** / **Dark** / **System** |

## 14.2 Changing your password

1. Open the **Security** tab.  
2. Enter your current password (if any) and a new password.  
3. Save.  

If you only use Google, create a local password via **Create password** so you can also sign in with email.

## 14.3 Notifications

Use the bell in the navigation. There is no separate `/notifications` page — everything goes through the bell panel.

---

# 15. Super Admin role (brief)

General users do **not** use the Master Console. This summary only explains who runs the platform:

| Area under `/admin` | Purpose |
| --- | --- |
| **User Management** | Manage users |
| **Host requests** | Approve / reject Host requests |
| **Wiki Entities** | Moderate wiki content |
| **Sports** | Manage sports |
| **Payment settings** / **System Settings** | Platform configuration |

If your Host request is stuck, contact admins via **Contact Us** or official Gud Game channels.

---

# 16. FAQ & troubleshooting

## 16.1 Accounts & login

**I did not receive a verification email.**  
Check spam/promotions. Click **Resend verification email**. Confirm the email spelling.

**I forgot my password.**  
Use **Forgot password?** — do not create a second account with the same email.

**I use Google and cannot sign in with email.**  
Create a password under **Settings → Security → Create password**.

**I have a partner account — why can’t I open the Gud Game dashboard?**  
Partner member accounts are separate. Create or use a Gud Game account at `/register` or `/login` for the platform dashboard.

## 16.2 Profile & dashboard

**I keep getting sent to complete profile.**  
Fill legal name, phone, gender, and at least one sport, then **Save profile**.

**My career stats are empty.**  
You may not have Official results yet, or you only played Fun Match / partner events (which do not feed Official ranking).

## 16.3 Tournaments & registration

**Register is missing or locked.**  
Check: signed in? Registration still open? Slots left? Eligibility (category/tier)? Event not stuck in Draft?

**I paid but still see Payment pending.**  
Wait briefly for webhook sync, refresh, check **Payments** & notifications. If it stays too long, contact the host with payment proof.

**My teammate never got the invite.**  
Ask the captain to resend; check spam; confirm the invite email.

## 16.4 Match day & TV

**The TV score is not updating.**  
Confirm the tournament is **Live**, the manage device is online, TV Wi-Fi is stable, and the Display layout points at the correct court/match.

**Who may enter scores?**  
Only Hosts / staff with Manage access — not spectators on the TV.

## 16.5 Partners

**Member login fails on a partner site.**  
Use `/{partnerSlug}/login`, not Gud Game `/login`.

**Staff accidentally used the member form.**  
Use Gud Game login + **Partner console**, or the staff link on the partner login page.

## 16.6 Security

- Gud Game / official organizers will **not** ask for your password in private chat.  
- Be careful with links outside the `gudgame.id` domain.  
- Use a trusted device for checkout.

---

# 17. Glossary

| Term | Simple meaning |
| --- | --- |
| **Gud Game** | Product / platform name |
| **Player** | Default community role |
| **Host** | Tournament organizer on Gud Game |
| **Partner** | White-label brand/community at `/{slug}` |
| **Official** | Formal tournament (paid or free; ranking-related) |
| **Fun Match** | Community session without Official ranking |
| **Sport hub** | Per-sport home (`/sports/padel`, etc.) |
| **Wiki** | Encyclopedia of players / teams / gear / rules |
| **Bracket** | Knockout chart |
| **Double Stage** | Groups then knockout |
| **Manage** | Match-day operator panel |
| **Display / Live Display** | TV mode for spectators |
| **Checkout** | Choose method and finish payment |
| **QRIS** | Indonesian QR payment standard |
| **Registration** | Entering as a player / team |
| **Claim** | Claiming an invited teammate slot |
| **Payout** | Paying out funds to a Host |
| **Partner console** | Partner staff dashboard |
| **Super Admin** | Gud Game platform admin |
| **Tier / No Rank** | Skill gate; No Rank = no ranking points |

---

## Appendix — important page map

```text
Home                 /
Register             /register
Sign in              /login
Forgot password      /forgot-password
Player dashboard     /dashboard
Complete profile     /dashboard/complete-profile
Settings             /dashboard/settings
Host                 /dashboard/host
Partner console      /dashboard/partner
Sport hub            /sports/{sport}
Tournament           /sports/{sport}/tournaments/{slug}
  Register           …/register
  Confirm            …/register/confirm
  Checkout           …/register/checkout
  Success            …/register/success
  Manage             …/manage
  TV Display         …/display
Search               /search
Partner site         /{partnerSlug}
  Member login       /{partnerSlug}/login
  Member signup      /{partnerSlug}/signup
```

---

## Related documents

| Document | When to read it |
| --- | --- |
| [README.md](./README.md) | Full documentation index |
| [overview.md](./overview.md) | Product overview |
| [features.md](./features.md) | Feature catalog |
| [tournament-guide.md](./tournament-guide.md) | Tournament ops manual (hosts/QA; Indonesian) |
| [tv-display.md](./tv-display.md) | TV mode details |
| [partner-auth.md](./partner-auth.md) | Partner member authentication |
| [bestie-cup-guide.md](./bestie-cup-guide.md) | Partner event playbook |
| [payments-and-payouts.md](./payments-and-payouts.md) | Payments background (more technical) |

---

*© Gud Game — User Manual. Living document: update when UI flows change.*
