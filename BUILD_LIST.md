# HARBOUR — Product Build List
**Version 1.7 · March 2026 · Confidential**

*This document tracks all features, fixes, and deferred items for the Harbour MVP and beyond. Items are grouped by phase. Update status as work progresses.*

---

## Phase 1 — MVP screens (complete)

| Item | Notes | Status |
|------|-------|--------|
| **Landing page** | *harbour-landing.html* | ✓ Done |
| **6-step input form** | *harbour-input-v2.html — fortnightly SG calc, ASFA defaults, bidirectional spend inputs* | ✓ Done |
| **Forecast screen** | *harbour-forecast-v2.html — Monte Carlo chart, Centrelink calculation* | ✓ Done |
| **Slide-in save panel** | *Create account, sign in, forgot password, confirmation views* | ✓ Done |
| **Account dashboard** | *harbour-dashboard.html — saved forecasts, rate-change notice, upgrade banner* | ✓ Done |
| **Admin config dashboard** | *harbour-admin.html — inline editing, due-date indicators, change log* | ✓ Done |

---

## Phase 2 — Pre-launch build

### Authentication & accounts

| Item | Notes | Status |
|------|-------|--------|
| **User registration (email + password)** | *Wired to Supabase Auth — working* | ✓ Done |
| **User sign in** | *Wired to Supabase Auth — working* | ✓ Done |
| **Session management** | *JWT tokens, persistent login, sign out — working* | ✓ Done |
| **Password reset flow** | *Email reset link via Resend — fully working end to end* | ✓ Done |
| **Email confirmation on sign-up** | *ON in Supabase — callback route verifies token_hash via verifyOtp() and redirects to /dashboard* | ✓ Done |
| **User profile page** | *Live at /profile — display name, email change, password change, plan badge (Free / Harbour Plus)* | ✓ Done |
| **Delete account** | *Fully wired — deletes user + all forecasts via service role API, redirects to landing* | ✓ Done |

### Forecast calculation engine

| Item | Notes | Status |
|------|-------|--------|
| **Monte Carlo simulation (JavaScript)** | *1,000 runs, fortnightly SG compounding, full Centrelink calc, year-by-year output curves* | ✓ Done |
| **Config layer (database)** | *All config figures in Supabase config table — seeded and editable via admin* | ✓ Done |
| **Forecast API route** | *POST /api/forecast — authenticated, pulls config, runs JS engine, saves to DB* | ✓ Done |
| **Forecast input form (Next.js)** | *6-step form — name, age (25–85), super, salary, spending, retirement age (60–75). ASFA presets, SG callout, disclaimer checkbox.* | ✓ Done |
| **Forecast results page (Next.js)** | *Chart.js Monte Carlo chart, stat cards, plain English summary* | ✓ Done |
| **Contributions tax fix (15% on SG)** | *0.85 multiplier on all concessional contributions on entry — verified* | ✓ Done |
| **Salary sacrifice input** | *Optional annual SS input, 15% contributions tax, soft warning > $30k/yr combined* | ✓ Done |
| **Non-concessional contributions (NCC)** | *Optional annual NCC input, no tax on entry, soft warning above $120k/yr cap* | ✓ Done |
| **Concessional & NCC cap config rows** | *concessional_cap ($30,000) and non_concessional_cap ($120,000) in config and admin* | ✓ Done |
| **Pension card — zero entitlement display** | *Shows 'Not eligible' with explanation when threshold exceeded* | ✓ Done |
| **Pension eligible-from-age** | *When not eligible at 67, scans p50 curve to find first age balance drops below threshold — shows "Eligible from approximately age X" on results cards* | ✓ Done |
| **Engine v2 — mid-year compounding** | *Contributions earn half-year average growth (fortnightly approximation) rather than zero* | ✓ Done |
| **Engine v2 — ATO minimum drawdown** | *Legislated minimum annual withdrawals enforced by age band: 4% / 5% / 6% / 7% / 9% / 11%* | ✓ Done |
| **Engine v2 — Transfer Balance Cap** | *Excess above cap ($2m) stays in accumulation phase and is taxed at 15% on earnings in retirement* | ✓ Done |
| **Engine v3 — Super fund fees** | *Annual fee drag applied to returns in both accumulation and retirement phases. Config: fee_rate (default 0.67% — ASIC industry average). Editable via admin dashboard.* | ✓ Done |
| **Preservation age input constraint** | *Retirement age input minimum raised to 60 — matches ATO preservation age* | ✓ Done |
| **Mandatory disclaimer checkbox** | *Step 6 of forecast form — checkbox required before Run forecast button activates* | ✓ Done |
| **Contributions tax spot-check** | *Verified — post-fix Karen median retirement balance lower than pre-fix figure ✅* | ✓ Done |
| **Pension eligible-from-age (Phase 3)** | *When balance exceeds threshold at 67, scan p50 curve for first age pension becomes payable* | ✓ Done |

### Admin dashboard

| Item | Notes | Status |
|------|-------|--------|
| **Admin config page (Next.js)** | *Minimal white theme, flat tables, click-to-edit inline, last updated per row. Live at /admin* | ✓ Done |
| **Admin API route** | *POST /api/admin/config — saves config to Supabase via service role key* | ✓ Done |
| **Admin authentication** | *Protected by ADMIN_EMAIL env variable* | ✓ Done |
| **Stale forecast detection** | *Stale forecasts (created before latest config update) show an inline badge on the forecast card: "Data updated — delete and run a new forecast". Top-level rate-change banner removed.* | ✓ Done |
| **Concessional & NCC caps in admin** | *concessional_cap and non_concessional_cap editable via admin dashboard* | ✓ Done |
| **Fee rate in admin** | *fee_rate config row — add via SQL: `INSERT INTO config (key, value, label, section) VALUES ('fee_rate', 0.67, 'Super fund fee rate (% p.a.)', 'model')`* | ✓ Done |

### Account dashboard & profile

| Item | Notes | Status |
|------|-------|--------|
| **Dashboard rebuild (Next.js)** | *Forecast cards with real outputs, greeting, delete, sign out, account details, upgrade banner* | ✓ Done |
| **Forecast card stats** | *Each card shows super at retirement, Age Pension /fn, funds last age* | ✓ Done |
| **User profile page link** | *Edit profile → link in account details; avatar/email in nav also links to /profile* | ✓ Done |
| **Auth-aware landing page nav** | *Shows My dashboard button when logged in (cookie-based Supabase session check)* | ✓ Done |
| **Delete account API** | *Live at /api/account/delete — service role deletion, cascade removes all forecasts* | ✓ Done |

### Email & CRM

| Item | Notes | Status |
|------|-------|--------|
| **Resend transactional email** | *Domain verified, SMTP wired to Supabase, sending from noreply@harbourapp.com.au* | ✓ Done |
| **Email templates (Supabase)** | *Confirmation and password reset emails styled in Harbour navy/gold design* | ✓ Done |
| **Loops CRM setup** | *Account created, mail.harbourapp.com.au sending domain verified in Cloudflare* | ✓ Done |
| **Loops — Supabase webhook** | *Incoming webhook connected — new signups automatically added to Loops as contacts* | ✓ Done |
| **Welcome email (Loops)** | *Drafted, formatted, and activated as a Loop triggered on contact created* | ✓ Done |
| **Loops — existing user import** | *One-time CSV export from Supabase Auth, import into Loops contacts* | → To do |
| **Rate-change notification email** | *Blast to all users when Centrelink rates update in March/September* | → To do |
| **Re-engagement email** | *Nudge users who haven't logged in for 60+ days* | → To do |

### Infrastructure & compliance

| Item | Notes | Status |
|------|-------|--------|
| **Supabase project setup** | *Database schema, RLS policies, Auth config — complete* | ✓ Done |
| **Vercel deployment** | *Live at https://harbourapp.com.au — auto-deploys from GitHub master* | ✓ Done |
| **Domain registration** | *harbourapp.com.au — registered at VentraIP, DNS on Cloudflare, SSL active* | ✓ Done |
| **Cloudflare email routing** | *Catch-all forwards all @harbourapp.com.au to Shayne's inbox* | ✓ Done |
| **Privacy Policy** | *Live at /privacy — covers Australian Privacy Act 1988* | ✓ Done |
| **Terms of Service** | *Live at /terms — general information framing, limitation of liability* | ✓ Done |
| **ABN registration** | *ABN registered — required before charging for the product* | ✓ Done |
| **Google Search Console** | *harbourapp.com.au verified via Cloudflare DNS, sitemap submitted* | ✓ Done |
| **Landing page mobile responsive** | *Viewport meta tag added, two breakpoints (960px, 480px), hero wrap fixed* | ✓ Done |
| **Aesthetic & copy review** | *Review all pages before Stripe integration — in progress* | ✓ Done |

---

## Phase 3 — Post-launch & paid tier

| Item | Notes | Status |
|------|-------|--------|
| **Stripe integration** | *Subscription billing — $55/yr (Harbour Plus). Checkout via /api/stripe/checkout, webhook at /api/stripe/webhook sets is_plus = true / false on profiles table. Upgrade page wired to Stripe. Currently using test keys — swap to live keys when Plus features are ready to ship* | ✓ Done |
| **Paid tier gate — forecast limit** | *Free accounts capped at 3 saved forecasts. API returns FORECAST_LIMIT_REACHED (403) when exceeded. Plus users bypass limit via is_plus flag on profiles table* | ✓ Done |
| **User tier management** | *profiles table live in Supabase — id, is_plus (bool), stripe_customer_id (nullable), created_at. RLS policies set. Auto-created on signup via trigger. is_plus read in /api/forecast and /profile* | ✓ Done |
| **Pricing page** | *Live at /upgrade — Free vs Plus cards, $55/yr, feature comparison, FAQ. Stripe button replaced with disabled "Coming soon" button and hint text. Already-Plus users see active state* | ✓ Done |
| **Partner / couples details** | *Additional input step — partner age, super, salary, salary sacrifice, non-concessional contributions. Combined super pool, couple ASFA presets. Partner step inserted as step 2 in both pre-retiree and retiree flows.* | ✓ Done |
| **Combined Age Pension calc (couples)** | *Assets test and deeming for couple — combined thresholds. Couple pension max (2× each rate). Config keys: pension_base/supplement/energy_couple, assets_lower/upper_couple_owner, income_free_area_couple, deeming_threshold_couple.* | ✓ Done |
| **Partner NCC input field** | *Partner non-concessional contributions field added to couple step (was hardcoded to 0). Annual after-tax amount partner contributes from savings. Shows on review screen.* | ✓ Done |
| **Engine bug fixes — couple safe spending** | *Three bugs fixed: (1) fundsLast depletion check used strict === 0 — floating-point issue caused binary search to spiral to $5M cap. Fixed to < $1. (2) Transfer Balance Cap applied single-person TBC ($1.9M) against combined couple balance — excess kept in accumulation phase, taxed at 15%. Fixed to 2× TBC for couples. (3) Binary search upper bound used only primary super balance, ignoring partner balance. Fixed to combined balance.* | ✓ Done |
| **PDF export** | *Paid feature — forecast summary as downloadable PDF* | → To do |
| **Forecast re-run with pre-filled inputs** | *Dashboard ↺ button now loads saved forecast inputs into the form (all fields pre-populated) and jumps to review step, with a notice banner confirming re-run mode. User can navigate back to edit any step before re-running.* | ✓ Done |
| **Forecast re-run prompt** | *Email via Loops when Centrelink rates update in March or September* | → To do |
| **Safe spending forecast (reverse solver)** | *"How much can I safely spend?" mode — binary search reverse-solver finds max annual spending at conservative (90%), balanced (50%), and optimistic (10%) confidence levels to a user-set target age. Fully separate results view with headline, three spending bands, pension card, chart, and summary. Available to both authenticated and unauthenticated users.* | ✓ Done |
| **Sustainable spending metric** | *Year-by-year simulation showing annual spend supportable to age 90 accounting for investment returns and increasing pension as balance draws down* | → To do |
| **Adjustable assumptions** | *Let user tweak return rates, inflation, longevity target — longevity target paid feature* | → To do |
| **Mobile responsive polish** | *Viewport meta tag added to layout.js (was missing — critical). All app screens reviewed and fixed: dashboard forecast card stats visible on mobile (were hidden), action button tap targets increased to 40px, nav overflow resolved on forecast screens, save banner and CTA buttons stack full-width on mobile, chart/summary section padding reduced, upgrade price font scaled down. Additional 420px breakpoint added to forecast form for preset button stacking and tighter padding.* | ✓ Done |
| **Loops — existing user import** | *One-time CSV export from Supabase Auth, import into Loops contacts* | → To do |
| **Retired user mode** | *Skip accumulation phase, handle Age Pension from current balance for users already past 67* | ✓ Done |

---

## Phase 3b — UX redesign & safe spending (March 2026 session)

### New landing page & dual input flows

| Item | Notes | Status |
|------|-------|--------|
| **Landing page rebuild** | *Full branded landing page replacing static redirect. "Are you already retired?" toggle (No—still working / Yes—already retired) sets context. Two CTA cards route to appropriate forecast mode. Feature pills, auth-aware nav, footer disclaimer.* | ✓ Done |
| **Pre-retiree flow (6-step)** | *Unchanged 6-step form for users still working — age, super + contributions, retirement age, spending or horizon, confirm.* | ✓ Done |
| **Retiree flow (4-step)** | *Simplified 4-step form for already-retired users. Steps: name + retired toggle → age + super balance → mode toggle + spending/horizon → confirm. Passes retirement_age = current_age and zeroes salary/contributions.* | ✓ Done |
| **"Already retired?" toggle in form** | *Step 1 of both flows includes the retired/working toggle — accessible to logged-in users navigating directly to /forecast/new, not only from landing page.* | ✓ Done |
| **URL param initialisation** | *?mode= and ?retired= URL params set initial form state. Suspense wrapper added for useSearchParams compatibility with Next.js App Router.* | ✓ Done |

### Safe spending results

| Item | Notes | Status |
|------|-------|--------|
| **Safe spending API route** | *POST /api/forecast/safe-spending — runs runSafeSpending() binary search, saves inputs with mode: 'safe_spending' and target_horizon for authenticated users.* | ✓ Done |
| **Super balance stat cards on results** | *Three stat cards on safe spending results: Current super balance (gold), Projected super at retirement or Funds projected to last (blue, conditional on yearsToRetirement), Estimated Age Pension (green).* | ✓ Done |
| **Conditional middle stat card** | *When retirement_age = current_age (already retired, yearsToRetirement = 0), replaces redundant "Projected super at retirement · 0 years of growth" with "Funds projected to last until" showing p50/p10/p90 depletion ages.* | ✓ Done |
| **Safe spending results — unauthenticated** | *Full safe spending view in forecast/preview/page.js: headline amount, three spending bands (conservative/balanced/optimistic), pension card, chart, summary section.* | ✓ Done |
| **Safe spending results — authenticated** | *Full safe spending view in forecast/[id]/page.js: same layout as preview. Mode detected via inputs.mode || 'traditional'. Previously always rendered traditional view regardless of mode.* | ✓ Done |
| **Chart safe spending mode** | *Chart spending line uses safe_spending_balanced amount and labelled "Balanced safe spending" instead of "Spending target" when isSafeChart.* | ✓ Done |

### Bug fixes & audit

| Item | Notes | Status |
|------|-------|--------|
| **Fix: preview traditional view retiree card** | *preview/page.js traditional view lacked yearsToRetirement > 0 guard on gold stat card — always showed "Projected super at retirement · after 0 years of growth" for retirees. Fixed to show "Current super balance" when yearsToRetirement = 0, matching [id]/page.js behaviour.* | ✓ Done |
| **Volatility calibration review** | *Audited return_volatility assumption against Chant West, SuperRatings, ASIC MoneySmart, and Morningstar AU balanced fund data. 12% is consistent with high-growth options; balanced funds run 8.5–10%. Recommended and confirmed change to 10% via admin console. Verified against live API — spread/median ratio confirms 10% is now active.* | ✓ Done |
| **MoneySmart benchmark comparison** | *Ran four representative scenarios through both Harbour and a MoneySmart-equivalent deterministic model. Harbour median within −4% to +1% of MoneySmart on accumulation — divergence is theoretically correct volatility drag. Harbour materially extends MoneySmart: full drawdown phase, Centrelink integration, sequence-of-returns risk, safe spending reverse-solver.* | ✓ Done |

---

## Phase 4 — Ongoing config updates

*These are recurring admin tasks — not build items. All updates are made in the admin dashboard only.*

| What to update | When | Source |
|----------------|------|--------|
| Age Pension payment rates | 20 Mar & 20 Sep each year | servicesaustralia.gov.au |
| Assets test thresholds | 20 Mar & 20 Sep each year | servicesaustralia.gov.au |
| Income test free area | 20 Mar & 20 Sep each year | servicesaustralia.gov.au |
| Deeming rates | As announced — now reviewed by Australian Government Actuary | budget.gov.au / Services Australia |
| ASFA comfortable & modest standards | Quarterly — Mar, Jun, Sep, Dec | asfa.asn.au |
| Transfer Balance Cap | 1 July each year — rises to $2,100,000 on 1 July 2026 | ato.gov.au |
| Concessional contributions cap | 1 July each year — rises to $32,500 on 1 July 2026 | ato.gov.au |
| Non-concessional contributions cap | 1 July each year — rises to $130,000 on 1 July 2026 | ato.gov.au |
| Super fund fee rate | Review annually — currently 0.67% (ASIC industry average) | ato.gov.au / ASIC MoneySmart |
| SG rate | Only if legislation changes — currently 12% | ato.gov.au |

---

## Deferred — future iterations

| Item | Notes | Status |
|------|-------|--------|
| **Couples config in admin dashboard** | *Added — couple pension, assets, income, deeming, ASFA sections now in admin* | ✓ Done |
| **ASFA couples standards** | *Added — asfa_comfortable_couple and asfa_modest_couple config keys added* | ✓ Done |
| **Non-homeowner thresholds** | *Add non-homeowner rows when user profile is expanded* | ○ Deferred |
| **Other assets (shares, property, savings)** | *Out of MVP scope — significant additional inputs and Centrelink calc complexity* | ○ Deferred |
| **Defined benefit pensions** | *Separate income stream treatment — deferred post-MVP* | ○ Deferred |
| **Downsizer contributions** | *Complex eligibility rules — deferred post-MVP* | ○ Deferred |
| **SMSF** | *Out of scope — refer users to a financial adviser* | ○ Deferred |
| **Aged care planning** | *Separate product territory — future iteration* | ○ Deferred |
| **Historical Monte Carlo** | *Real Australian market data — technically feasible but data-sourcing dependent* | ○ Deferred |
| **Pension CPI indexation in engine** | *Currently pension rates held flat in nominal terms — conservative but defensible. Future accuracy improvement.* | ○ Deferred |
| **AFSL review** | *Consult lawyer before scaling — confirm general information framing holds* | ○ Deferred |

---

## Notes

- ASFA values update quarterly — set a calendar reminder for the first week of March, June, September and December.
- Centrelink Age Pension rates and thresholds update on 20 March and 20 September each year. Allow 1–2 business days after announcement for confirmed figures before updating.
- Deeming rates are now reviewed by the Australian Government Actuary and will be increased incrementally. From 20 March 2026 rates rise to 1.25% (lower) and 3.25% (upper) — update admin dashboard on that date.
- Concessional cap rises to $32,500 and NCC cap rises to $130,000 on 1 July 2026. Transfer Balance Cap rises to $2,100,000 on 1 July 2026. Update all three in the admin dashboard on that date.
- Super fund fee rate (fee_rate) config row: add via Supabase SQL editor — `INSERT INTO config (key, value, label, section, last_updated) VALUES ('fee_rate', 0.67, 'Super fund fee rate (% p.a.)', 'model', CURRENT_DATE)`. Review annually.
- Engine v3 enhancements: mid-year contribution compounding, ATO minimum drawdown by age band, Transfer Balance Cap split at retirement, super fund fees applied as return drag, pension eligible-from-age scan. All in engine/forecast.js.
- Retirement age input minimum is 60 (preservation age). Maximum remains 75.
- Couples admin config rows and ASFA couples standards should be added to the admin dashboard at the same time as the partner feature is built — not before.
- All config updates are made in the admin dashboard only — never edit code or database directly.
- Email confirmation is ON in Supabase. Confirmation now redirects to /dashboard via token_hash verification in /auth/callback.
- Profile page at /profile allows users to update display name, email, and password. Display name stored in Supabase user_metadata.display_name and used in dashboard greeting. Plan status (Free / Harbour Plus) shown via is_plus field from profiles table.
- profiles table: id (uuid, FK to auth.users), is_plus (bool, default false, not null), stripe_customer_id (text, nullable), created_at (timestamptz). RLS: users can read/update own row only. Auto-created on signup via Supabase trigger.
- Forecast limit: free users capped at 3 saved forecasts. /api/forecast checks profiles.is_plus — if false, counts existing forecasts and returns 403 FORECAST_LIMIT_REACHED at ≥3. Plus users bypass the check entirely.
- /upgrade page at /upgrade — pricing page with Free vs Plus comparison. Stripe checkout removed; Plus card shows disabled "Coming soon" button with hint text. Already-Plus users see active state.
- Delete account is fully wired — service role key deletes user from Supabase Auth, cascade delete removes all forecasts automatically.

---

*Harbour — Build List v1.7 — March 2026 — Confidential*
