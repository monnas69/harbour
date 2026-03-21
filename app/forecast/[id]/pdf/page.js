'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

const fmt = (val) => {
  if (val === null || val === undefined) return '—';
  if (val >= 1_000_000) return '$' + (val / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'm';
  if (val >= 1_000) return '$' + Math.round(val / 1_000) + 'k';
  return '$' + Math.round(val).toLocaleString('en-AU');
};

const fmtFull = (val) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(val ?? 0);

function deflateScalar(nominalVal, years, inflation = 0.025) {
  if (years <= 0 || !nominalVal) return nominalVal;
  return Math.round(nominalVal / Math.pow(1 + inflation, years));
}

export default function ForecastPdfPage() {
  const { id } = useParams();
  const router = useRouter();
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push('/auth/login'); return; }
        const { data, error: dbErr } = await supabase
          .from('forecasts').select('*').eq('id', id).single();
        if (dbErr || !data) throw new Error('Forecast not found.');
        setForecast(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, router]);

  if (loading) return <div style={S.loading}>Loading…</div>;
  if (error) return <div style={S.loading}>{error}</div>;

  const inputs  = forecast.inputs  || {};
  const outputs = forecast.outputs || {};

  const name           = forecast.name?.trim() || inputs.name?.trim() || 'Client';
  const currentAge     = inputs.current_age;
  const superBalance   = inputs.super_balance;
  const retirementAge  = inputs.retirement_age;
  const annualSpending = inputs.annual_spending;
  const isSafe         = (inputs.mode || 'traditional') === 'safe_spending';
  const targetHorizon  = outputs.target_horizon || inputs.target_horizon || 90;
  const yearsToRet     = retirementAge - currentAge;

  const retBalNominal = outputs.retirement_balance_median;
  const retBalReal    = deflateScalar(retBalNominal, yearsToRet);

  const pensionAnnual     = outputs.pension_annual;
  const pensionFortnightly = pensionAnnual ? Math.round(pensionAnnual / 26) : null;
  const pensionFromAge    = outputs.pension_eligible_from_age;

  const fundsLastP10 = outputs.funds_last_p10;
  const fundsLastP50 = outputs.funds_last_p50;
  const fundsLastP90 = outputs.funds_last_p90;

  const safeConservative = outputs.safe_spending_conservative;
  const safeBalanced     = outputs.safe_spending_balanced;
  const safeAggressive   = outputs.safe_spending_aggressive;

  const createdAt = new Date(forecast.created_at).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // ── Milestone table rows ──────────────────────────────────────────────────
  const ages    = outputs.ages || [];
  const p50vals = outputs.p50  || [];
  const milestones = [retirementAge, 67, 70, 75, 80, 85, 90, targetHorizon]
    .filter((a, i, arr) => a && a >= currentAge && arr.indexOf(a) === i)
    .sort((a, b) => a - b)
    .map((age) => {
      const idx = ages.indexOf(age);
      const val = idx >= 0 ? p50vals[idx] : null;
      const real = val ? deflateScalar(val, age - currentAge) : null;
      return { age, real };
    });

  return (
    <>
      <style>{css}</style>
      <div className="pdf-root">

        {/* ── Page 1: Cover ──────────────────────────────────────────────── */}
        <div className="pdf-page cover-page">
          <div className="cover-logo">
            <svg width="44" height="44" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="17" stroke="#c9a84c" strokeWidth="1.2"/>
              <line x1="18" y1="7" x2="18" y2="29" stroke="#c9a84c" strokeWidth="1.5"/>
              <line x1="11" y1="14" x2="25" y2="14" stroke="#c9a84c" strokeWidth="1.5"/>
              <path d="M11 29 Q18 24 25 29" stroke="#c9a84c" strokeWidth="1.5" fill="none"/>
            </svg>
            <span className="cover-logo-text">Harbour</span>
          </div>

          <div className="cover-body">
            <div className="cover-tag">Retirement Forecast Report</div>
            <h1 className="cover-name">{name}</h1>
            <div className="cover-sub">Prepared {createdAt}</div>
          </div>

          <div className="cover-summary-grid">
            <div className="cover-stat">
              <div className="cover-stat-label">Current age</div>
              <div className="cover-stat-value">{currentAge}</div>
            </div>
            <div className="cover-stat">
              <div className="cover-stat-label">Retirement age</div>
              <div className="cover-stat-value">{retirementAge}</div>
            </div>
            <div className="cover-stat">
              <div className="cover-stat-label">Current super</div>
              <div className="cover-stat-value">{fmt(superBalance)}</div>
            </div>
            <div className="cover-stat">
              <div className="cover-stat-label">Target horizon</div>
              <div className="cover-stat-value">Age {targetHorizon}</div>
            </div>
          </div>

          <div className="cover-mode-badge">
            {isSafe ? 'Safe Spending Mode' : 'Traditional Spending Mode'}
          </div>

          <div className="cover-footer">
            General information only · Not financial advice · For personal use
          </div>
        </div>

        {/* ── Page 2: Retirement at a glance ─────────────────────────────── */}
        <div className="pdf-page">
          <div className="page-header">
            <span className="page-header-title">Retirement at a Glance</span>
            <span className="page-header-name">{name}</span>
          </div>

          <p className="section-intro">
            The figures below reflect the median (50th percentile) projection, expressed in
            today's dollars using 2.5% p.a. inflation.
          </p>

          <div className="kpi-grid">
            <div className="kpi-card highlight">
              <div className="kpi-label">Projected super at retirement (real)</div>
              <div className="kpi-value">{fmt(retBalReal)}</div>
              <div className="kpi-sub">Median · age {retirementAge} · today's dollars</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">{isSafe ? 'Balanced safe spending' : 'Annual spending target'}</div>
              <div className="kpi-value">{fmt(isSafe ? safeBalanced : annualSpending)}</div>
              <div className="kpi-sub">{isSafe ? 'per year (today\'s dollars)' : 'per year as entered'}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Age Pension (annual)</div>
              <div className="kpi-value">{pensionAnnual > 0 ? fmtFull(Math.round(pensionAnnual / 100) * 100) : 'Not eligible at 67'}</div>
              <div className="kpi-sub">
                {pensionAnnual > 0
                  ? `${fmtFull(pensionFortnightly)} per fortnight from age 67`
                  : pensionFromAge ? `Eligible from approx. age ${pensionFromAge}` : 'Based on assets & income tests'}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Funds last to (median)</div>
              <div className="kpi-value">Age {fundsLastP50 || '—'}</div>
              <div className="kpi-sub">
                Pessimistic: age {fundsLastP10 || '—'} · Optimistic: age {fundsLastP90 || '—'}
              </div>
            </div>
          </div>

          {isSafe && (
            <>
              <h2 className="section-h2">Safe Spending Scenarios</h2>
              <table className="pdf-table">
                <thead>
                  <tr>
                    <th>Scenario</th>
                    <th>Annual Income</th>
                    <th>Monthly</th>
                    <th>Fortnightly</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Conservative</td>
                    <td>{fmt(safeConservative)}</td>
                    <td>{fmt(safeConservative ? Math.round(safeConservative / 12) : null)}</td>
                    <td>{fmt(safeConservative ? Math.round(safeConservative / 26) : null)}</td>
                  </tr>
                  <tr className="row-highlight">
                    <td><strong>Balanced</strong></td>
                    <td><strong>{fmt(safeBalanced)}</strong></td>
                    <td><strong>{fmt(safeBalanced ? Math.round(safeBalanced / 12) : null)}</strong></td>
                    <td><strong>{fmt(safeBalanced ? Math.round(safeBalanced / 26) : null)}</strong></td>
                  </tr>
                  <tr>
                    <td>Aggressive</td>
                    <td>{fmt(safeAggressive)}</td>
                    <td>{fmt(safeAggressive ? Math.round(safeAggressive / 12) : null)}</td>
                    <td>{fmt(safeAggressive ? Math.round(safeAggressive / 26) : null)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="table-note">All figures in today's dollars. Includes projected Age Pension entitlement where applicable.</p>
            </>
          )}
        </div>

        {/* ── Page 3: Milestone projections ──────────────────────────────── */}
        <div className="pdf-page">
          <div className="page-header">
            <span className="page-header-title">Projected Super Balance by Age</span>
            <span className="page-header-name">{name}</span>
          </div>

          <p className="section-intro">
            Median projected superannuation balance at key ages, expressed in today's dollars.
            Results are modelled projections — not guaranteed outcomes.
          </p>

          <table className="pdf-table">
            <thead>
              <tr>
                <th>Age</th>
                <th>Balance (today's $)</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {milestones.map(({ age, real }) => (
                <tr key={age} className={age === retirementAge ? 'row-highlight' : ''}>
                  <td>Age {age}</td>
                  <td>{real ? fmt(real) : '—'}</td>
                  <td style={{ color: '#8a9bb0', fontSize: 11 }}>
                    {age === retirementAge ? 'Retirement' : age === 67 ? 'Age Pension eligibility' : age === targetHorizon ? 'Target horizon' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="table-note">
            Median scenario (50th percentile). Deflated using 2.5% p.a. inflation. Does not include Age Pension income.
          </p>

          <h2 className="section-h2">Outcome Range Summary</h2>
          <table className="pdf-table">
            <thead>
              <tr>
                <th>Scenario</th>
                <th>Funds last to age</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Pessimistic (10th %ile)</td>
                <td>{fundsLastP10 || '—'}</td>
                <td style={{ color: '#8a9bb0', fontSize: 11 }}>Poor market returns</td>
              </tr>
              <tr className="row-highlight">
                <td><strong>Median (50th %ile)</strong></td>
                <td><strong>{fundsLastP50 || '—'}</strong></td>
                <td style={{ color: '#8a9bb0', fontSize: 11 }}>Expected outcome</td>
              </tr>
              <tr>
                <td>Optimistic (90th %ile)</td>
                <td>{fundsLastP90 || '—'}</td>
                <td style={{ color: '#8a9bb0', fontSize: 11 }}>Strong market returns</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Page 4: Inputs & Assumptions ───────────────────────────────── */}
        <div className="pdf-page">
          <div className="page-header">
            <span className="page-header-title">Inputs &amp; Assumptions</span>
            <span className="page-header-name">{name}</span>
          </div>

          <h2 className="section-h2">Your Inputs</h2>
          <table className="pdf-table">
            <tbody>
              <tr><td>Current age</td><td>{currentAge}</td></tr>
              <tr><td>Retirement age</td><td>{retirementAge}</td></tr>
              <tr><td>Target horizon</td><td>Age {targetHorizon}</td></tr>
              <tr><td>Current super balance</td><td>{fmtFull(superBalance)}</td></tr>
              {!isSafe && <tr><td>Annual spending target</td><td>{fmtFull(annualSpending)}</td></tr>}
              <tr><td>Forecast mode</td><td>{isSafe ? 'Safe Spending' : 'Traditional'}</td></tr>
              {inputs.employer_contributions != null && (
                <tr><td>Employer contributions (% salary)</td><td>{inputs.employer_contributions}%</td></tr>
              )}
              {inputs.salary != null && (
                <tr><td>Current salary</td><td>{fmtFull(inputs.salary)}</td></tr>
              )}
              {inputs.extra_contributions != null && inputs.extra_contributions > 0 && (
                <tr><td>Extra contributions (annual)</td><td>{fmtFull(inputs.extra_contributions)}</td></tr>
              )}
            </tbody>
          </table>

          <h2 className="section-h2">Model Assumptions</h2>
          <table className="pdf-table">
            <tbody>
              <tr><td>Investment return (nominal)</td><td>7.0% p.a.</td></tr>
              <tr><td>Investment fees</td><td>0.5% p.a.</td></tr>
              <tr><td>Inflation</td><td>2.5% p.a.</td></tr>
              <tr><td>Monte Carlo simulations</td><td>1,000 paths</td></tr>
              <tr><td>Age Pension basis</td><td>Current Centrelink rates & thresholds</td></tr>
              <tr><td>Tax treatment</td><td>Super in accumulation to retirement; pension phase from retirement age</td></tr>
            </tbody>
          </table>

          <div className="disclaimer-box">
            <strong>Important:</strong> This report is for general information purposes only and does not
            constitute financial advice. Results are modelled projections based on the assumptions above
            and are not guaranteed. Superannuation laws, tax rules, and Centrelink means tests change
            regularly. Always verify your personal circumstances with a licensed financial adviser or
            Services Australia before making retirement decisions.
          </div>

          <div className="pdf-footer">
            <span>Harbour · harbour.finance</span>
            <span>Generated {createdAt}</span>
          </div>
        </div>

      </div>

      {/* Print button — hidden on print */}
      <div className="print-controls no-print">
        <button onClick={() => window.print()} className="print-btn">Print / Save as PDF</button>
        <button onClick={() => router.back()} className="back-btn">← Back</button>
      </div>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  loading: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0D1F35', color: '#8a9bb0', fontFamily: 'DM Sans, sans-serif' },
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body { background: #1a2a3a; font-family: 'DM Sans', sans-serif; }

.pdf-root { max-width: 820px; margin: 0 auto; padding: 32px 16px 80px; }

.pdf-page {
  background: #0D1F35;
  border: 1px solid rgba(201,168,76,0.15);
  border-radius: 4px;
  padding: 56px 64px;
  margin-bottom: 32px;
  min-height: 1056px;
  position: relative;
}

/* ── Cover ── */
.cover-page { display: flex; flex-direction: column; justify-content: space-between; }
.cover-logo { display: flex; align-items: center; gap: 10px; }
.cover-logo-text { font-family: 'Playfair Display', serif; font-size: 22px; color: #c9a84c; letter-spacing: 0.04em; }
.cover-body { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 60px 0 40px; }
.cover-tag { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #8a9bb0; margin-bottom: 18px; }
.cover-name { font-family: 'Playfair Display', serif; font-size: 48px; font-weight: 600; color: #f5f0e8; margin-bottom: 10px; line-height: 1.15; }
.cover-sub { font-size: 14px; color: #8a9bb0; }
.cover-summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: rgba(201,168,76,0.15); border: 1px solid rgba(201,168,76,0.15); border-radius: 3px; overflow: hidden; margin-bottom: 24px; }
.cover-stat { background: rgba(13,31,53,0.98); padding: 18px 20px; }
.cover-stat-label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #8a9bb0; margin-bottom: 6px; }
.cover-stat-value { font-size: 22px; font-weight: 600; color: #c9a84c; font-family: 'Playfair Display', serif; }
.cover-mode-badge { display: inline-block; padding: 6px 14px; border: 1px solid rgba(201,168,76,0.3); border-radius: 20px; font-size: 11px; color: #c9a84c; letter-spacing: 0.08em; }
.cover-footer { font-size: 10px; color: rgba(138,155,176,0.5); margin-top: 32px; text-align: center; letter-spacing: 0.06em; }

/* ── Page header ── */
.page-header { display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 16px; border-bottom: 1px solid rgba(201,168,76,0.2); margin-bottom: 28px; }
.page-header-title { font-family: 'Playfair Display', serif; font-size: 22px; color: #f5f0e8; }
.page-header-name { font-size: 12px; color: #8a9bb0; }

/* ── Section ── */
.section-intro { font-size: 13px; color: #8a9bb0; line-height: 1.65; margin-bottom: 28px; }
.section-h2 { font-family: 'Playfair Display', serif; font-size: 16px; color: #c9a84c; margin: 32px 0 14px; }

/* ── KPI grid ── */
.kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 8px; }
.kpi-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(201,168,76,0.12); border-radius: 3px; padding: 20px 22px; }
.kpi-card.highlight { border-color: rgba(201,168,76,0.4); background: rgba(201,168,76,0.05); }
.kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #8a9bb0; margin-bottom: 8px; }
.kpi-value { font-size: 26px; font-family: 'Playfair Display', serif; color: #f5f0e8; margin-bottom: 6px; }
.kpi-card.highlight .kpi-value { color: #c9a84c; }
.kpi-sub { font-size: 11px; color: #8a9bb0; line-height: 1.5; }

/* ── Table ── */
.pdf-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.pdf-table th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.09em; color: #8a9bb0; border-bottom: 1px solid rgba(201,168,76,0.2); padding: 8px 12px; font-weight: 500; }
.pdf-table td { padding: 10px 12px; color: #d4c9b8; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: top; }
.pdf-table tr:last-child td { border-bottom: none; }
.pdf-table td:first-child { color: #8a9bb0; font-size: 12px; }
.row-highlight td { background: rgba(201,168,76,0.06); }
.row-highlight td:first-child { color: #c9a84c; }
.table-note { font-size: 10.5px; color: rgba(138,155,176,0.7); margin-top: 10px; line-height: 1.5; }

/* ── Disclaimer ── */
.disclaimer-box { margin-top: 32px; padding: 18px 20px; border: 1px solid rgba(201,168,76,0.15); border-radius: 3px; background: rgba(201,168,76,0.04); font-size: 11.5px; color: #8a9bb0; line-height: 1.7; }
.disclaimer-box strong { color: #c9a84c; }

/* ── Footer ── */
.pdf-footer { position: absolute; bottom: 32px; left: 64px; right: 64px; display: flex; justify-content: space-between; font-size: 10px; color: rgba(138,155,176,0.4); border-top: 1px solid rgba(255,255,255,0.05); padding-top: 12px; }

/* ── Print controls ── */
.print-controls { position: fixed; bottom: 24px; right: 24px; display: flex; gap: 10px; z-index: 100; }
.print-btn { padding: 10px 22px; background: #c9a84c; border: none; border-radius: 4px; color: #0D1F35; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; }
.print-btn:hover { background: #d4b45c; }
.back-btn { padding: 10px 22px; background: transparent; border: 1px solid rgba(201,168,76,0.3); border-radius: 4px; color: #c9a84c; font-family: 'DM Sans', sans-serif; font-size: 14px; cursor: pointer; }
.back-btn:hover { background: rgba(201,168,76,0.07); }

/* ── Print ── */
@media print {
  body { background: white !important; }
  .pdf-root { max-width: 100%; padding: 0; }
  .pdf-page { border: none; border-radius: 0; margin-bottom: 0; padding: 40px 56px; min-height: 100vh; page-break-after: always; background: white !important; color: #111 !important; }
  .no-print { display: none !important; }
  .pdf-footer { color: #999; border-top-color: #ddd; }
  .page-header { border-bottom-color: #ddd; }
  .page-header-title { color: #111; }
  .cover-name { color: #111; }
  .cover-logo-text, .cover-stat-value, .kpi-value, .section-h2, .cover-mode-badge { color: #7a6030; }
  .pdf-table td { color: #333; border-bottom-color: #eee; }
  .pdf-table th { border-bottom-color: #ccc; }
  .disclaimer-box { border-color: #ddd; background: #fafaf7; }
  .kpi-card { border-color: #ddd; background: #fafaf7; }
  .kpi-card.highlight { border-color: #c9a84c; background: #fffdf5; }
  .cover-summary-grid { background: #ddd; }
  .cover-stat { background: #fafaf7; }
}
`;
