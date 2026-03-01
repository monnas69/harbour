# Harbour — Project Context

> Paste this file into a new chat, then type **continue** to pick up where we left off.

---

## What is Harbour?

Harbour is a DIY retirement planning web application for Australians aged 40–75. It provides Monte Carlo-based forecasting of retirement outcomes, integrating Centrelink Age Pension rules and ATO superannuation rules. It shows projections only — it does not provide financial advice.

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
| Framework | Next.js 16 (App Router) | JavaScript, no TypeScript |
| Styling | Tailwind CSS | |
| Linter | Biome | |
| Database | Supabase (Postgres) | Hosted, managed |
| Auth | Supabase Auth | Email + password, no magic links |
| Forecast engine | Python 3.14 | Runs server-side via `child_process.spawn` |
| Email | Resend | Not yet set up |
| Payments | Stripe | Phase 3, not yet set up |
| Hosting | Vercel | Not yet deployed |
| Domain | harbour.com.au | Not yet registered |

**Python command on Shayne's machine:** `py` (not `python` or `python3`)
**pip command:** `py -m pip install`

---

## Supabase Project

- **URL:** https://hjavfsgiynsgwncrzhjl.supabase.co
- **Region:** Southeast Asia (Singapore)
- **Auth:** Email provider enabled, email confirmation OFF (for testing — turn ON before launch)

---

## Project File Structure

```
harbour/
├── app/
│   ├── api/
│   │   └── forecast/
│   │       └── route.js        ← POST endpoint, runs Python engine, saves to DB
│   ├── auth/
│   │   └── login/
│   │       └── page.js         ← Sign in / create account (client component)
│   ├── dashboard/
│   │   └── page.js             ← Saved forecasts list (server component)
│   └── page.js                 ← Redirects to /auth/login
├── engine/
│   ├── forecast.py             ← Monte Carlo simulation engine
│   └── test.py                 ← Local test script for engine
├── lib/
│   └── supabase.js             ← Browser Supabase client (createClient)
├── middleware.js                ← Session management across all routes
├── .env.local                  ← Supabase URL + anon key (never commit)
└── [standard Next.js files]
```

---

## Database Schema

### `forecasts` table
| Column | Type | Notes |
|---|---|---|
| id | uuid | Primary key, auto-generated |
| user_id | uuid | References auth.users, cascade delete |
| name | text | e.g. "Margaret's forecast" |
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

**User inputs (MVP):** Name, current age (40–85), current super balance, target retirement age (> current age, max 75)

**Default assumptions:** Homeowner = true, single person, no other assessable assets

**Age Pension eligibility age:** 67

**Centrelink calculation:**
1. Assets test: reduce pension by $3/fn per $1,000 above lower threshold
2. Income test: deem assets at 1.25% / 3.25%, reduce pension by 50¢ per $1 over free area
3. Take the LOWER result of the two tests
4. Pension cannot go below $0

**Super taxation:** Withdrawals post-60 tax-free. Accumulation phase earnings net of 15% tax.

**Monte Carlo:** 1,000 runs, 6.5% accumulation return, 5.5% retirement return, 12% volatility, 2.5% inflation, modelled to age 90.

---

## HTML Mockup Screens (design reference only)

These are static HTML files created during the design phase. They are the visual reference for what the real Next.js pages should look like.

| File | Description |
|---|---|
| `harbour-landing.html` | Landing page |
| `harbour-input-v2.html` | 6-step input form |
| `harbour-forecast-v2.html` | Forecast results + Monte Carlo chart |
| `harbour-dashboard.html` | Account dashboard |
| `harbour-admin.html` | Admin config dashboard |

**Design language:** Navy (`#0D1F35`) + gold (`#C9A84C`) + cream (`#F5F0E8`). Fonts: Playfair Display (headings) + DM Sans (body).

**Key UI decisions:**
- Fortnightly figures shown first throughout (Australian convention)
- Slide-in panel for save/auth on forecast screen
- Stale forecast detection — flag forecasts generated before last config update

---

## Build Status

### ✓ Done
- All HTML mockup screens (landing, input, forecast, dashboard, admin)
- Next.js project created and running locally
- Supabase project created, database tables created, config seeded
- Supabase Auth working (email + password sign up / sign in)
- Dashboard page — shows saved forecasts, pulls from DB
- Python forecast engine — Monte Carlo simulation with full Centrelink calc
- Forecast API route (`POST /api/forecast`) — authenticated, pulls config from DB, runs Python, saves result

### → Next up
- Forecast input form (Next.js version of the 6-step HTML mockup)
- Forecast results page (Next.js version wired to real API data)
- Connect sign-in/sign-out properly to dashboard
- Deploy to Vercel
- Register domain

### Phase 3 (post-launch)
- Stripe integration + paid tier
- Partner / couples details
- PDF export
- Forecast re-run prompt

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

- Privacy Policy required before collecting user data (Australian Privacy Act)
- Terms of Service required — must frame as general information, not financial advice
- ABN required before charging
- AFSL — current framing (general information with disclaimers) does not require licence. Confirm with lawyer before scaling.

---

## Disclaimer (must appear on every forecast screen)

> This forecast is for general information purposes only and does not constitute financial advice. Results are projections based on modelled assumptions and are not guaranteed. Centrelink rules and superannuation laws change regularly — always verify your personal entitlements with Services Australia or a licensed financial adviser before making retirement decisions.

---

*Harbour | Context Document | February 2026 | Confidential*