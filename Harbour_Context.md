# Harbour — Project Context

> Paste this file into a new chat, then type **continue** to pick up where we left off.

---

## What is Harbour?

Harbour is a DIY retirement planning web application for Australians aged 25–75. It provides Monte Carlo-based forecasting of retirement outcomes, integrating Centrelink Age Pension rules and ATO superannuation rules. It shows projections only — it does not provide financial advice.

**Previously called RetireSmart** during the design phase.

---

## The Person Building It

- **Name:** Shayne (monnas69 on GitHub)
- **OS:** Windows
- **Terminal:** PowerShell
- **Skill level:** Non-developer — needs every step explained
- **GitHub:** https://github.com/monnas69/harbour
- **Working directory:** `C:\Users\Shayne\Documents\harbour`

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js (App Router) | JavaScript, no TypeScript |
| Styling | Tailwind CSS + inline styles | |
| Linter | Biome | |
| Database | Supabase (Postgres) | Hosted, managed |
| Auth | Supabase Auth | Email + password, no magic links |
| Forecast engine | JavaScript | Ported from Python — runs server-side in API route |
| Email | Resend | Not yet set up |
| Payments | Stripe | Phase 3, not yet set up |
| Hosting | Vercel | ✅ Live at https://harbour-pi.vercel.app |
| Domain | harbour.com.au | Not yet registered |

**Important — Next.js 15 note:** `cookies()` must be awaited (`const cookieStore = await cookies()`) in all API routes.

---

## Supabase Project

- **URL:** https://hjavfsgiynsgwncrzhjl.supabase.co
- **Region:** Southeast Asia (Singapore)
- **Auth:** Email provider enabled, email confirmation OFF (for testing — turn ON before launch)

---

## Vercel Deployment

- **Live URL:** https://harbour-pi.vercel.app
- **Repo:** https://github.com/monnas69/harbour (branch: master)
- **Auto-deploys:** Yes — every push to master triggers a redeploy

**Important:** After any deployment, always open a fresh browser tab rather than refreshing — stale cached chunks will cause a white screen crash.

**Environment variables set in Vercel:**
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ADMIN_EMAIL
NEXT_PUBLIC_ADMIN_EMAIL
```

---

## Project File Structure

```
harbour/
├── app/
│   ├── api/
│   │   ├── forecast/
│   │   │   └── route.js          ← POST endpoint, runs JS engine, saves to DB if authenticated
│   │   └── admin/
│   │       └── config/
│   │           └── route.js      ← POST endpoint, saves config to DB (service role)
│   ├── auth/
│   │   └── login/
│   │       └── page.js           ← Sign in / create account — full Harbour styling
│   ├── dashboard/
│   │   └── page.js               ← Saved forecasts list, account details, sign out
│   ├── forecast/
│   │   ├── new/
│   │   │   └── page.js           ← 6-step input form (public — no login required)
│   │   ├── preview/
│   │   │   └── page.js           ← Guest results page — reads from sessionStorage
│   │   └── [id]/
│   │       └── page.js           ← Saved results page (authenticated users only)
│   ├── admin/
│   │   └── page.js               ← Admin config dashboard (protected by ADMIN_EMAIL)
│   ├── privacy/
│   │   └── page.js               ← Privacy Policy page
│   ├── terms/
│   │   └── page.js               ← Terms of Service page
│   ├── layout.js                 ← Root layout — loads Playfair Display + DM Sans via Next.js fonts
│   └── page.js                   ← Redirects to /harbour-landing.html
├── engine/
│   └── forecast.js               ← Monte Carlo simulation engine (JavaScript)
├── public/
│   └── harbour-landing.html      ← Landing page (served as static file)
├── lib/
│   └── supabase.js               ← Browser Supabase client (createClient)
├── middleware.js                  ← Route protection — public: /forecast/new, /forecast/preview
├── .env.local                    ← Supabase URL + anon key + service role key + admin email
└── [standard Next.js files]
```

**Note:** Python engine files (`engine/forecast.py`, `engine/test.py`) have been removed. The JS engine in `engine/forecast.js` is the only forecast engine.

---

## Environment Variables (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=https://hjavfsgiynsgwncrzhjl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        ← Used by admin API route to bypass RLS
ADMIN_EMAIL=...                      ← Server-side admin check
NEXT_PUBLIC_ADMIN_EMAIL=...          ← Client-side admin check (same email)
```

---

## Database Schema

### `forecasts` table
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key, auto-generated |
| user_id | uuid | References auth.users, cascade delete |
| name | text | e.g. "Karen's forecast" |
| inputs | jsonb | All user inputs |
| outputs | jsonb | Percentile bands from engine |
| config_version | timestamptz | When forecast was generated |
| created_at | timestamptz | Auto |

RLS: users can only read/insert/delete their own rows.

### `config` table
| Column | Type | Notes |
|---|---|---|
| key | text | Primary key, e.g. `pension_base_single` |
| value | numeric | The figure |
| label | text | Human readable name |
| section | text | pension / assets / income / deeming / asfa / super / model |
| last_updated | date | |
| next_due | date | |

RLS: public readable, service role write only.

**All 22 config rows are seeded** with current Centrelink/ATO/ASFA figures as of February 2026.

---

## Config Keys (complete list)

```
pension_base_single          1020.60
pension_supplement_single      83.40
pension_energy_single          14.10
assets_lower_single_owner  301750
assets_upper_single_owner  714500
assets_taper_rate               3
income_free_area_single       218
income_reduction_rate          0.50
deeming_rate_lower             1.25
deeming_threshold_single   64200
deeming_rate_upper             3.25
asfa_comfortable_single    51000
asfa_modest_single         36000
sg_rate                       12
transfer_balance_cap      1900000
drawdown_under_65               4
drawdown_65_74                  5
drawdown_75_79                  6
return_accumulation            6.5
return_retirement              5.5
return_volatility             12
inflation_rate                 2.5
```

---

## MVP Rules Summary

**User inputs (MVP):** Name, current age (25–85), current super balance, annual salary (optional), target retirement age (> current age, max 75), annual retirement spending

**Default assumptions:** Homeowner = true, single person, no other assessable assets

**Age Pension eligibility age:** 67

**Centrelink calculation:**
1. Assets test: reduce pension by $3/fn per $1,000 above lower threshold
2. Income test: deem assets at 1.25% / 3.25%, reduce pension by 50¢ per $1 over free area
3. Take the LOWER result of the two tests
4. Pension cannot go below $0

**Super taxation:** Withdrawals post-60 tax-free. Accumulation phase earnings net of 15% tax (applied to returns only, not the whole balance).

**Monte Carlo:** 1,000 runs, 6.5% accumulation return, 5.5% retirement return, 12% volatility (9.6% in retirement phase — 80% of accumulation), 2.5% inflation, modelled to age 90. Seeded with seed 42 for reproducible results.

---

## Forecast Engine — Input/Output Shape

### Inputs sent to JS engine (from `POST /api/forecast`):
```json
{
  "name": "Karen",
  "current_age": 58,
  "super_balance": 420000,
  "salary": 80000,
  "annual_spending": 51000,
  "retirement_age": 65
}
```

### Outputs returned by engine (saved to `forecasts.outputs`):
```json
{
  "ages": [58, 59, ..., 90],
  "p10": [...],
  "p50": [...],
  "p90": [...],
  "retirement_balance_median": 669611,
  "pension_annual": 2785,
  "funds_last_p10": 81,
  "funds_last_p50": 87,
  "funds_last_p90": 90
}
```

---

## Guest vs Authenticated Forecast Flow

**Guest (not logged in):**
1. Fills in `/forecast/new` — no login required
2. Form posts to `/api/forecast` — engine runs, no DB save
3. Results stored in `sessionStorage` as `harbour_preview`
4. Redirected to `/forecast/preview` — full results with "Save your forecast" banner and CTA
5. Sign up / sign in options throughout to convert to account

**Authenticated:**
1. Fills in `/forecast/new`
2. Form posts to `/api/forecast` — engine runs, saved to DB
3. Redirected to `/forecast/[id]` — full results page

---

## Route Protection (middleware.js)

| Route | Access |
|---|---|
| `/forecast/new` | Public |
| `/forecast/preview` | Public |
| `/forecast/[id]` | Authenticated only |
| `/dashboard` | Authenticated only |
| `/admin` | Authenticated only (+ ADMIN_EMAIL check) |
| `/auth/login` | Public |
| `/privacy` | Public |
| `/terms` | Public |

---

## HTML Mockup Screens (design reference only)

These are static HTML files created during the design phase. They live in the repo root and are NOT served by Next.js (except `harbour-landing.html` which is in `public/`).

| File | Description |
|---|---|
| `public/harbour-landing.html` | Landing page — live at `/` |
| `harbour-input-v2.html` | 6-step input form (reference only) |
| `harbour-forecast-v2.html` | Forecast results + Monte Carlo chart (reference only) |
| `harbour-dashboard.html` | Account dashboard (reference only) |
| `harbour-admin.html` | Admin config dashboard (reference only) |

**Design language:** Navy (`#0D1F35`) + gold (`#C9A84C`) + cream (`#F5F0E8`). Fonts: Playfair Display (headings) + DM Sans (body). Fonts are loaded via Next.js font system (self-hosted — no Google Fonts CDN dependency).

**Key UI decisions:**
- Fortnightly figures shown first throughout (Australian convention)
- Stale forecast detection — flag forecasts generated before last config update
- Admin page protected by `ADMIN_EMAIL` env variable
- Admin page CSS classes use `adm-` prefix (not `ad-`) — ad blockers hide elements with `ad-` prefix

---

## Known Issues & Fixes Applied

| Issue | Fix |
|---|---|
| `cookies()` must be awaited in Next.js 15 | `const cookieStore = await cookies()` in all API routes |
| Python engine not supported on Vercel | Replaced with `engine/forecast.js` — pure JS, no dependencies |
| Admin page white screen with AdBlock | CSS classes renamed from `ad-` to `adm-` prefix |
| Fonts blocked by ad blockers | Fonts loaded via Next.js font system in `app/layout.js` |
| Stale chunk crash after deployment | Always open a fresh tab after deployment — never just refresh |
| Forecast engine import path | Must be `../../../engine/forecast.js` — three levels up from `app/api/forecast/route.js` |

---

## Build Status

### ✓ Done
- All HTML mockup screens (landing, input, forecast, dashboard, admin)
- Next.js project created and deployed to Vercel
- Supabase project created, database tables created, config seeded
- Supabase Auth working (email + password sign up / sign in)
- Forecast input form — 6-step (`app/forecast/new/page.js`) — public, no login required
  - Name, age, super balance, optional salary with live SG callout
  - ASFA Comfortable/Modest presets, bidirectional annual ↔ fortnightly spend
  - Review & confirm step, posts to `/api/forecast`
- JavaScript forecast engine (`engine/forecast.js`)
  - Seeded PRNG (mulberry32, seed 42) for reproducible results
  - Retirement phase volatility 9.6% (80% of accumulation)
  - Pension calculated at age-67 balance (not retirement balance)
  - `funds_last_p10/p50/p90` — age when money runs out per scenario
- Forecast API route (`POST /api/forecast`)
  - Authenticated: saves to DB, returns `{ id, ...outputs }`
  - Unauthenticated: runs engine, returns outputs only (no save)
- Forecast results page (`app/forecast/[id]/page.js`) — authenticated users
  - 3 stat cards, Chart.js Monte Carlo chart, plain English summary, disclaimer
- Forecast preview page (`app/forecast/preview/page.js`) — guest users
  - Reads from `sessionStorage`, full results display
  - Save banner at top + CTA at bottom to create account
- Dashboard (`app/dashboard/page.js`)
  - Greeting, rate change notice, forecast cards, delete, sign out, account details
- Admin config dashboard (`app/admin/page.js`)
  - 22 config keys, inline editing, due-date indicators, session change log
- Landing page (`public/harbour-landing.html`) — live at `/`
- Login page — full Harbour design (navy/gold/cream)
- Privacy Policy (`app/privacy/page.js`) — live at `/privacy`
  - Australian Privacy Act compliant, 13 sections
  - Linked from landing page footer and login page
- Terms of Service (`app/terms/page.js`) — live at `/terms`
  - 12 sections, Australian law, general information framing
  - Linked from landing page footer and login page
- `middleware.js` — route protection
- Forecast figures verified correct against manual Centrelink calculations ✅
- `app/layout.js` — Playfair Display + DM Sans loaded via Next.js font system

### → Next up (before launch)
- Password reset flow (Resend email not yet wired)
- Email confirmation — currently OFF in Supabase Auth, turn ON before launch
- Domain registration — harbour.com.au (check VentraIP)

### Phase 3 (post-launch)
- Stripe integration + paid tier
- Partner / couples details
- PDF export
- Forecast re-run prompt
- Adjustable assumptions (return rates, inflation, longevity)
- Mobile responsive polish (iOS Safari)

### Deferred
- Couples config in admin dashboard (add when partner feature built)
- ASFA couples standards (same)
- Non-homeowner thresholds
- Other assets, defined benefit pensions, downsizer contributions, SMSF
- AFSL review

---

## Ongoing Config Update Schedule

| What | When | Source |
|---|---|---|
| Age Pension rates | 20 Mar & 20 Sep | servicesaustralia.gov.au |
| Assets test thresholds | 20 Mar & 20 Sep | servicesaustralia.gov.au |
| Income test free area | 20 Mar & 20 Sep | servicesaustralia.gov.au |
| Deeming rates | As announced | budget.gov.au |
| ASFA comfortable & modest | Quarterly (Mar/Jun/Sep/Dec) | asfa.asn.au |
| Transfer Balance Cap | 1 July | ato.gov.au |
| SG rate | Only if legislation changes | ato.gov.au |

---

## Compliance Notes

- Privacy Policy ✅ live at `/privacy` — covers Australian Privacy Act 1988
- Terms of Service ✅ live at `/terms` — general information framing, limitation of liability
- ABN required before charging users (Phase 3)
- AFSL — current general information framing does not require a licence. Confirm with lawyer before scaling.
- Email: `privacy@harbour.com.au` referenced in Privacy Policy — set up before launch

---

## Disclaimer (must appear on every forecast screen)

> This forecast is for general information purposes only and does not constitute financial advice. Results are projections based on modelled assumptions and are not guaranteed. Centrelink rules and superannuation laws change regularly — always verify your personal entitlements with Services Australia or a licensed financial adviser before making retirement decisions.

---

*Harbour | Context Document | March 2026 | Confidential*
