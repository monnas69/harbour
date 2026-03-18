'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// ── Helpers ───────────────────────────────────────────────────────────────────

// Deflate nominal future dollars to today's dollars (ASIC standard)
function deflateCurve(nominalCurve, ages, currentAge, inflation = 0.025) {
  return nominalCurve.map((val, i) => {
    const years = (ages[i] || (currentAge + i)) - currentAge;
    if (years <= 0 || val === 0) return val;
    return Math.round(val / Math.pow(1 + inflation, years));
  });
}

function deflateScalar(nominalVal, years, inflation = 0.025) {
  if (years <= 0 || !nominalVal) return nominalVal;
  return Math.round(nominalVal / Math.pow(1 + inflation, years));
}

const fmt = (val) => {
  if (val === null || val === undefined) return '—';
  if (val >= 1_000_000) return '$' + (val / 1_000_000).toFixed(2).replace(/\.?0+$/, '') + 'm';
  if (val >= 1_000) return '$' + Math.round(val / 1_000) + 'k';
  return '$' + Math.round(val).toLocaleString('en-AU');
};

const fmtFull = (val) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(val);

const fmtAge = (age) => {
  if (!age || age >= 95) return 'Age 95+';
  return 'Age ' + age;
};

function loadChartJs() {
  return new Promise((resolve) => {
    if (window.Chart) { resolve(window.Chart); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js';
    script.onload = () => resolve(window.Chart);
    document.head.appendChild(script);
  });
}

export default function ForecastPreviewPage() {
  const router = useRouter();
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  // ── Load from sessionStorage ──────────────────────────────────────────────
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('harbour_preview');
      if (!stored) {
        setError('No forecast found. Please run a new forecast.');
        return;
      }
      setData(JSON.parse(stored));
    } catch {
      setError('Could not load forecast. Please try again.');
    }
  }, []);

  // ── Build chart ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!data || !chartRef.current) return;

    const { inputs, outputs } = data;
    const ages = outputs.ages || [];
    const p10  = outputs.p10  || [];
    const p50  = outputs.p50  || [];
    const p90  = outputs.p90  || [];
    const inflation = 0.025;
    const currentAge = inputs.current_age;
    const isSafe = (inputs.mode || 'traditional') === 'safe_spending';

    // Deflate curves to today's dollars
    const p10Real = deflateCurve(p10, ages, currentAge, inflation);
    const p50Real = deflateCurve(p50, ages, currentAge, inflation);
    const p90Real = deflateCurve(p90, ages, currentAge, inflation);

    // Spending already in today's dollars; safe spending mode uses balanced amount
    const spendingAmt = isSafe
      ? (outputs.safe_spending_balanced || 0)
      : (inputs.annual_spending || 0);
    const spendingLine = ages.map(() => spendingAmt);

    loadChartJs().then((Chart) => {
      if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; }

      const ctx = chartRef.current.getContext('2d');
      const pensionAge = 67;
      const pensionIdx = ages.indexOf(pensionAge);

      chartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: ages.map((a) => 'Age ' + a),
          datasets: [
            { label: '_band_top', data: p90Real, borderWidth: 0, pointRadius: 0, fill: '+1', backgroundColor: 'rgba(201,168,76,0.07)', tension: 0.4 },
            { label: '_band_bot', data: p10Real, borderWidth: 0, pointRadius: 0, fill: false, tension: 0.4 },
            { label: 'Best case (90th %ile)', data: p90Real, borderColor: 'rgba(91,158,110,0.75)', borderWidth: 1.5, borderDash: [5, 4], pointRadius: 0, fill: false, tension: 0.4 },
            { label: 'Median (50th %ile)', data: p50Real, borderColor: '#c9a84c', borderWidth: 2.5, pointRadius: ages.map((a) => (a === pensionAge ? 5 : 0)), pointBackgroundColor: '#c9a84c', fill: false, tension: 0.4 },
            { label: 'Worst case (10th %ile)', data: p10Real, borderColor: 'rgba(192,97,74,0.75)', borderWidth: 1.5, borderDash: [5, 4], pointRadius: 0, fill: false, tension: 0.4 },
            { label: isSafe ? 'Balanced safe spending' : 'Spending target (today\'s $)', data: spendingLine, borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderDash: [3, 6], pointRadius: 0, fill: false, tension: 0 },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(13,31,53,0.97)', borderColor: 'rgba(201,168,76,0.3)', borderWidth: 1,
              titleColor: '#8a9bb0', bodyColor: '#f5f0e8',
              titleFont: { family: 'DM Sans', size: 12 }, bodyFont: { family: 'DM Sans', size: 13 },
              padding: 14,
              callbacks: {
                title: (items) => items[0].label,
                label: (item) => {
                  if (item.dataset.label.startsWith('_')) return null;
                  const val = item.raw;
                  const formatted = val >= 1_000_000 ? '$' + (val / 1_000_000).toFixed(2) + 'm' : '$' + Math.round(val / 1_000) + 'k';
                  return '  ' + item.dataset.label + ': ' + formatted;
                },
              },
            },
          },
          scales: {
            x: { ticks: { color: '#8a9bb0', font: { family: 'DM Sans', size: 11 }, maxTicksLimit: 10, callback: (val, i) => (ages[i] % 5 === 0 ? 'Age ' + ages[i] : '') }, grid: { color: 'rgba(255,255,255,0.04)' }, border: { color: 'rgba(201,168,76,0.1)' } },
            y: { min: 0, ticks: { color: '#8a9bb0', font: { family: 'DM Sans', size: 11 }, callback: (val) => { if (val >= 1_000_000) return '$' + (val / 1_000_000).toFixed(1) + 'm'; if (val >= 1_000) return '$' + Math.round(val / 1_000) + 'k'; return '$0'; } }, grid: { color: 'rgba(255,255,255,0.04)' }, border: { color: 'rgba(201,168,76,0.1)' } },
          },
        },
        plugins: [{
          id: 'pensionLine',
          afterDraw(chart) {
            if (pensionIdx < 0) return;
            const meta = chart.getDatasetMeta(3);
            if (!meta.data[pensionIdx]) return;
            const x = meta.data[pensionIdx].x;
            const { top, bottom } = chart.chartArea;
            const c = chart.ctx;
            c.save();
            c.setLineDash([4, 4]);
            c.strokeStyle = 'rgba(201,168,76,0.35)';
            c.lineWidth = 1;
            c.beginPath(); c.moveTo(x, top); c.lineTo(x, bottom); c.stroke();
            c.fillStyle = 'rgba(201,168,76,0.85)';
            c.font = '11px DM Sans'; c.textAlign = 'left';
            c.fillText('⚓ Age Pension', x + 6, top + 16);
            c.restore();
          },
        }],
      });
    });

    return () => { if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; } };
  }, [data]);

  // ── Loading / error ───────────────────────────────────────────────────────
  if (error) {
    return (
      <>
        <style>{baseStyles}</style>
        <div style={{ minHeight: '100vh', background: '#0D1F35', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#e08878', fontFamily: 'DM Sans, sans-serif' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
            <div style={{ fontSize: 16, marginBottom: 20 }}>{error}</div>
            <button onClick={() => router.push('/forecast/new')} style={{ padding: '10px 24px', background: '#c9a84c', border: 'none', borderRadius: 4, color: '#0D1F35', fontFamily: 'DM Sans, sans-serif', cursor: 'pointer', fontWeight: 600 }}>
              Run a new forecast
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <style>{baseStyles}</style>
        <div style={{ minHeight: '100vh', background: '#0D1F35', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#8a9bb0' }}>
            <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3, margin: '0 auto 16px' }} />
            <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>Loading your forecast…</div>
          </div>
        </div>
      </>
    );
  }

  const { inputs, outputs } = data;
  const name           = inputs.name?.trim() || '';
  const currentAge     = inputs.current_age;
  const superBalance   = inputs.super_balance;
  const retirementAge  = inputs.retirement_age;
  const annualSpending = inputs.annual_spending;
  const forecastMode   = inputs.mode || 'traditional';
  const isSafeSpending = forecastMode === 'safe_spending';
  const targetHorizon  = outputs.target_horizon || inputs.target_horizon || 90;
  const inflation      = 0.025;

  const yearsToRetirement = retirementAge - currentAge;

  // Deflate retirement balance to today's dollars
  const retirementBalanceNominal = outputs.retirement_balance_median;
  const retirementBalanceMedian  = deflateScalar(retirementBalanceNominal, yearsToRetirement, inflation);

  const pensionAnnual          = outputs.pension_annual;
  const pensionEligibleFromAge = outputs.pension_eligible_from_age || null;
  const fundsLastP10           = outputs.funds_last_p10;
  const fundsLastP50           = outputs.funds_last_p50;
  const fundsLastP90           = outputs.funds_last_p90;

  const pensionFortnightly = pensionAnnual ? Math.round(pensionAnnual / 26) : null;

  // Safe spending amounts (already in today's dollars — engine computes them as such)
  const safeConservative = outputs.safe_spending_conservative;
  const safeBalanced     = outputs.safe_spending_balanced;
  const safeAggressive   = outputs.safe_spending_aggressive;

  const navSection = (
    <>
      {/* Nav */}
      <nav className="hf-nav">
        <a href="/" className="hf-logo">
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="17" stroke="#c9a84c" strokeWidth="1"/>
            <line x1="18" y1="7" x2="18" y2="29" stroke="#c9a84c" strokeWidth="1.5"/>
            <line x1="11" y1="14" x2="25" y2="14" stroke="#c9a84c" strokeWidth="1.5"/>
            <path d="M11 29 Q18 24 25 29" stroke="#c9a84c" strokeWidth="1.5" fill="none"/>
          </svg>
          <span className="hf-logo-text">Harbour</span>
        </a>
        <div className="hf-nav-right">
          <button className="hf-btn-outline" onClick={() => router.push('/forecast/new')}>✎ New forecast</button>
          <button className="hf-btn-gold" onClick={() => router.push('/auth/login')}>Save this forecast →</button>
        </div>
      </nav>

      {/* Save banner */}
      <div className="hf-save-banner">
        <div className="hf-save-banner-inner">
          <div>
            <div className="hf-save-banner-title">Save your forecast for free</div>
            <div className="hf-save-banner-sub">Create a free account to save this forecast, track it over time, and re-run it when rates change.</div>
          </div>
          <div className="hf-save-banner-btns">
            <button className="hf-btn-gold" onClick={() => router.push('/auth/login?mode=signup')}>Create free account</button>
            <button className="hf-btn-outline-light" onClick={() => router.push('/auth/login')}>Sign in</button>
          </div>
        </div>
      </div>
    </>
  );

  const ctaSection = (
    <>
      <div className="hf-bottom-cta">
        <div className="hf-bottom-cta-title">Want to save this forecast?</div>
        <div className="hf-bottom-cta-sub">Create a free Harbour account to save your forecast, re-run it when Centrelink rates change, and track your progress over time.</div>
        <div className="hf-bottom-cta-btns">
          <button className="hf-cta-btn-gold" onClick={() => router.push('/auth/login?mode=signup')}>Create free account</button>
          <button className="hf-cta-btn-outline" onClick={() => router.push('/forecast/new')}>Run another forecast</button>
        </div>
      </div>
      <div className="hf-disclaimer">
        This forecast is for general information purposes only and does not constitute financial advice. Results are projections based on modelled assumptions and are not guaranteed. Centrelink rules and superannuation laws change regularly — always verify your personal entitlements with Services Australia or a licensed financial adviser before making retirement decisions.
      </div>
    </>
  );

  // ── Safe Spending results view ─────────────────────────────────────────────
  if (isSafeSpending) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
          ${baseStyles}
          ${safeSpendingStyles}
        `}</style>

        <div className="hf-root">
          {navSection}

          <div className="hf-page">
            <div className="hf-header">
              <div>
                <h1 className="hf-title">{name ? `${name}'s` : 'Your'} <em>Safe Spending Forecast</em></h1>
                <div className="hf-meta">
                  Age <span>{currentAge}</span> · Super balance <span>{fmtFull(superBalance)}</span> · Retirement age <span>{retirementAge}</span> · Target age <span>{targetHorizon}</span>
                </div>
              </div>
              <button className="hf-recalc-btn" onClick={() => router.push('/forecast/new')}>✎ Adjust inputs</button>
            </div>

            <div className="hf-real-dollars-notice">
              These spending amounts are in <strong>today's dollars</strong> — the engine adjusts for 2.5% p.a. inflation internally so you can act on these numbers now.
            </div>

            {/* Balance stat cards */}
            <div className="hf-stat-grid">
              <div className="hf-stat-card hf-stat-gold">
                <div className="hf-stat-label">Current super balance</div>
                <div className="hf-stat-value gold">{fmt(superBalance)}</div>
                <div className="hf-stat-sub">Today · age {currentAge}<br />starting point for this forecast</div>
              </div>
              {yearsToRetirement > 0 ? (
                <div className="hf-stat-card hf-stat-blue">
                  <div className="hf-stat-label">Projected super at retirement</div>
                  <div className="hf-stat-value blue">{retirementBalanceMedian ? fmt(retirementBalanceMedian) : '—'}</div>
                  <div className="hf-stat-sub">Median estimate at age {retirementAge} · in today's dollars<br />after {yearsToRetirement} year{yearsToRetirement !== 1 ? 's' : ''} of growth</div>
                </div>
              ) : (
                <div className="hf-stat-card hf-stat-blue">
                  <div className="hf-stat-label">Funds projected to last until</div>
                  <div className="hf-stat-value blue">{fmtAge(fundsLastP50)}</div>
                  <div className="hf-stat-sub">Median scenario at balanced spending<br />Best case {fmtAge(fundsLastP90)} · Worst case {fmtAge(fundsLastP10)}</div>
                </div>
              )}
              <div className="hf-stat-card hf-stat-green">
                <div className="hf-stat-label">Estimated Age Pension</div>
                <div className="hf-stat-value green" style={{ fontSize: pensionAnnual === 0 ? '22px' : undefined }}>
                  {pensionAnnual > 0 ? fmtFull(Math.round(pensionAnnual / 100) * 100) : 'Not eligible at 67'}
                </div>
                <div className="hf-stat-sub">
                  {pensionAnnual > 0
                    ? <>{fmtFull(pensionFortnightly)} per fortnight from age 67<br />factored into safe spending amounts above</>
                    : pensionEligibleFromAge
                    ? <>Projected balance exceeds threshold at 67<br />Eligible from approximately <strong style={{ color: '#7ec896' }}>age {pensionEligibleFromAge}</strong> as balance reduces</>
                    : <>Projected balance exceeds the assets or income test threshold</>
                  }
                </div>
              </div>
            </div>

            {/* Safe spending headline */}
            <div className="ss-headline">
              <div className="ss-headline-label">Balanced safe spending · Age {targetHorizon} target</div>
              <div className="ss-headline-value">{safeBalanced ? fmtFull(safeBalanced) : '—'}<span className="ss-headline-freq"> / year</span></div>
              <div className="ss-headline-sub">
                {safeBalanced ? fmtFull(Math.round(safeBalanced / 26)) : '—'} per fortnight · 50 % probability of funds lasting to age {targetHorizon}
              </div>
            </div>

            {/* Three spending bands */}
            <div className="ss-band-grid">
              <div className="ss-band-card ss-band-conservative">
                <div className="ss-band-label">Conservative</div>
                <div className="ss-band-value">{safeConservative ? fmtFull(safeConservative) : '—'}</div>
                <div className="ss-band-freq">{safeConservative ? fmtFull(Math.round(safeConservative / 26)) + ' / fortnight' : ''}</div>
                <div className="ss-band-prob">90 % probability funds last to age {targetHorizon}</div>
              </div>
              <div className="ss-band-card ss-band-balanced">
                <div className="ss-band-label">Balanced</div>
                <div className="ss-band-value">{safeBalanced ? fmtFull(safeBalanced) : '—'}</div>
                <div className="ss-band-freq">{safeBalanced ? fmtFull(Math.round(safeBalanced / 26)) + ' / fortnight' : ''}</div>
                <div className="ss-band-prob">50 % probability funds last to age {targetHorizon}</div>
              </div>
              <div className="ss-band-card ss-band-aggressive">
                <div className="ss-band-label">Optimistic</div>
                <div className="ss-band-value">{safeAggressive ? fmtFull(safeAggressive) : '—'}</div>
                <div className="ss-band-freq">{safeAggressive ? fmtFull(Math.round(safeAggressive / 26)) + ' / fortnight' : ''}</div>
                <div className="ss-band-prob">10 % probability funds last to age {targetHorizon}</div>
              </div>
            </div>

            {/* Pension card */}
            <div className="ss-pension-card">
              <div className="ss-pension-icon">⚓</div>
              <div>
                <div className="ss-pension-title">Age Pension included in these estimates</div>
                <div className="ss-pension-body">
                  {pensionAnnual > 0
                    ? <>An estimated Age Pension of <strong>{fmtFull(Math.round(pensionAnnual / 100) * 100)} per year</strong> ({fmtFull(pensionFortnightly)} / fortnight) from age 67 is factored into all three spending bands above.</>
                    : pensionEligibleFromAge
                    ? <>Your projected balance is too high for the Age Pension at 67. It's expected to become payable from approximately <strong>age {pensionEligibleFromAge}</strong> as your balance reduces — and is reflected in the projections above.</>
                    : <>At your projected balance level, no Age Pension entitlement is included in this forecast.</>
                  }
                </div>
              </div>
            </div>

            {/* Chart — portfolio balance at balanced spending */}
            <div className="hf-chart-section">
              <div className="hf-chart-top">
                <div className="hf-chart-title">Portfolio balance at balanced spending ({safeBalanced ? fmtFull(safeBalanced) : '—'}/yr)</div>
                <div className="hf-chart-legend">
                  <div className="hf-legend-item"><div className="hf-legend-line" style={{ borderTop: '2px dashed #7ec896' }} /><span style={{ color: '#7ec896' }}>Best case (90th %ile)</span></div>
                  <div className="hf-legend-item"><div className="hf-legend-line" style={{ background: '#c9a84c', height: 2 }} /><span style={{ color: '#c9a84c' }}>Median (50th %ile)</span></div>
                  <div className="hf-legend-item"><div className="hf-legend-line" style={{ borderTop: '2px dashed #e08878' }} /><span style={{ color: '#e08878' }}>Worst case (10th %ile)</span></div>
                </div>
              </div>
              <div className="hf-chart-wrap"><canvas ref={chartRef} /></div>
              <div className="hf-chart-note">Balanced spending of {safeBalanced ? fmtFull(safeBalanced) : '—'}/yr · all values in today's dollars · 1,000 simulated scenarios · Single homeowner</div>
            </div>

            {/* Summary */}
            <div className="hf-summary-section">
              <div className="hf-summary-label">What this forecast shows</div>
              <div className="hf-summary-text">
                With a super balance of <strong>{fmtFull(superBalance)}</strong> at age <strong>{currentAge}</strong> and a target retirement age of <strong>{retirementAge}</strong>, the balanced safe spending estimate is <strong>{safeBalanced ? fmtFull(safeBalanced) + ' per year' : '—'}</strong> in today's dollars — the level at which the median Monte Carlo scenario exhausts funds at age <strong>{targetHorizon}</strong>. The conservative estimate of <strong>{safeConservative ? fmtFull(safeConservative) + '/yr' : '—'}</strong> gives a 90 % chance of funds lasting to age {targetHorizon}, while the optimistic estimate of <strong>{safeAggressive ? fmtFull(safeAggressive) + '/yr' : '—'}</strong> carries a 10 % chance.
                {pensionAnnual > 0 && <> The Age Pension ({fmtFull(Math.round(pensionAnnual / 100) * 100)}/yr from age 67) supplements these drawdowns and is fully incorporated in the calculation.</>}
              </div>
              <div className="hf-summary-rows">
                <div className="hf-summary-row"><div className="hf-summary-row-label">Conservative · 90 % confidence</div><div className="hf-summary-row-val green">{safeConservative ? fmtFull(safeConservative) : '—'}</div></div>
                <div className="hf-summary-row"><div className="hf-summary-row-label">Balanced · 50 % confidence</div><div className="hf-summary-row-val gold">{safeBalanced ? fmtFull(safeBalanced) : '—'}</div></div>
                <div className="hf-summary-row"><div className="hf-summary-row-label">Optimistic · 10 % confidence</div><div className="hf-summary-row-val red">{safeAggressive ? fmtFull(safeAggressive) : '—'}</div></div>
              </div>
            </div>

            {ctaSection}
          </div>
        </div>
      </>
    );
  }

  // ── Traditional results view ───────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        ${baseStyles}
      `}</style>

      <div className="hf-root">

        {navSection}

        <div className="hf-page">

          {/* Header */}
          <div className="hf-header">
            <div>
              <h1 className="hf-title">{name ? `${name}'s` : 'Your'} <em>Retirement Forecast</em></h1>
              <div className="hf-meta">
                Age <span>{currentAge}</span> · Super balance <span>{fmtFull(superBalance)}</span> · Target retirement age <span>{retirementAge}</span>
              </div>
            </div>
            <button className="hf-recalc-btn" onClick={() => router.push('/forecast/new')}>✎ Adjust inputs</button>
          </div>

          {/* Today's dollars notice */}
          <div className="hf-real-dollars-notice">
            All projected balances are shown in <strong>today's dollars</strong> — adjusted for 2.5% p.a. inflation so you can directly compare them to what money buys now.
          </div>

          {/* Stat cards */}
          <div className="hf-stat-grid">

            {yearsToRetirement > 0 ? (
              <div className="hf-stat-card hf-stat-gold">
                <div className="hf-stat-label">Projected super at retirement</div>
                <div className="hf-stat-value gold">{retirementBalanceMedian ? fmt(retirementBalanceMedian) : '—'}</div>
                <div className="hf-stat-sub">Median estimate at age {retirementAge} · in today's dollars<br />after {yearsToRetirement} year{yearsToRetirement !== 1 ? 's' : ''} of growth</div>
              </div>
            ) : (
              <div className="hf-stat-card hf-stat-gold">
                <div className="hf-stat-label">Current super balance</div>
                <div className="hf-stat-value gold">{fmt(superBalance)}</div>
                <div className="hf-stat-sub">Today · age {currentAge}<br />starting point for this forecast</div>
              </div>
            )}

            <div className="hf-stat-card hf-stat-green">
              <div className="hf-stat-label">Estimated Age Pension</div>
              <div className="hf-stat-value green" style={{ fontSize: pensionAnnual === 0 ? '22px' : undefined }}>
                {pensionAnnual > 0 ? fmtFull(Math.round(pensionAnnual / 100) * 100) : 'Not eligible at 67'}
              </div>
              <div className="hf-stat-sub">
                {pensionAnnual > 0
                  ? <>{fmtFull(pensionFortnightly)} per fortnight from age 67<br />based on assets &amp; income tests</>
                  : pensionEligibleFromAge
                  ? <>Projected balance exceeds threshold at 67<br />Eligible from approximately <strong style={{ color: '#7ec896' }}>age {pensionEligibleFromAge}</strong> as your balance reduces</>
                  : <>Not eligible from age 67<br />Projected balance exceeds the assets or income test threshold</>
                }
              </div>
            </div>

            <div className="hf-stat-card hf-stat-blue">
              <div className="hf-stat-label">Funds projected to last until</div>
              <div className="hf-stat-value blue">{fmtAge(fundsLastP50)}</div>
              <div className="hf-stat-sub">Median scenario<br />Best case {fmtAge(fundsLastP90)} · Worst case {fmtAge(fundsLastP10)}</div>
            </div>

          </div>

          {/* Chart */}
          <div className="hf-chart-section">
            <div className="hf-chart-top">
              <div className="hf-chart-title">Portfolio balance over time</div>
              <div className="hf-chart-legend">
                <div className="hf-legend-item"><div className="hf-legend-line" style={{ borderTop: '2px dashed #7ec896' }} /><span style={{ color: '#7ec896' }}>Best case (90th %ile)</span></div>
                <div className="hf-legend-item"><div className="hf-legend-line" style={{ background: '#c9a84c', height: 2 }} /><span style={{ color: '#c9a84c' }}>Median (50th %ile)</span></div>
                <div className="hf-legend-item"><div className="hf-legend-line" style={{ borderTop: '2px dashed #e08878' }} /><span style={{ color: '#e08878' }}>Worst case (10th %ile)</span></div>
                <div className="hf-legend-item"><div className="hf-legend-line" style={{ borderTop: '1px dashed rgba(255,255,255,0.35)' }} /><span style={{ color: 'rgba(255,255,255,0.4)' }}>Spending target</span></div>
              </div>
            </div>
            <div className="hf-chart-wrap"><canvas ref={chartRef} /></div>
            <div className="hf-chart-note">All values in today's dollars (2.5% inflation adjustment) · 1,000 simulated scenarios · Single homeowner · Returns net of 0.67% p.a. fees</div>
          </div>

          {/* Summary */}
          <div className="hf-summary-section">
            <div className="hf-summary-label">What this forecast shows</div>
            <div className="hf-summary-text">
              Based on a current super balance of <strong>{fmtFull(superBalance)}</strong> at age <strong>{currentAge}</strong>, with a target retirement age of <strong>{retirementAge}</strong>, Harbour projects a median super balance of approximately <strong>{retirementBalanceMedian ? fmt(retirementBalanceMedian) : '—'} in today's dollars</strong> at retirement. From age <strong>67</strong>, {pensionAnnual > 0
                ? <>an estimated Age Pension of <strong>{fmtFull(Math.round(pensionAnnual / 100) * 100)} per year</strong> supplements super drawdowns, calculated under the Centrelink assets and income tests.</>
                : pensionEligibleFromAge
                ? <>the projected balance exceeds the Centrelink assets test threshold, so no Age Pension is payable initially. Based on the median projection, Age Pension entitlement is expected to begin from approximately <strong>age {pensionEligibleFromAge}</strong> as the balance reduces.</>
                : <>the projected balance exceeds the Centrelink assets and income test thresholds throughout retirement, so no Age Pension is included in this projection.</>
              }{' '}In the median scenario, funds are projected to last to approximately <strong>{fmtAge(fundsLastP50)}</strong>. The range across all simulated outcomes runs from <strong>{fmtAge(fundsLastP10)}</strong> in the worst case to <strong>{fmtAge(fundsLastP90)}</strong> in the best case.
            </div>
            <div className="hf-summary-rows">
              <div className="hf-summary-row"><div className="hf-summary-row-label">Best case · funds last</div><div className="hf-summary-row-val green">{fmtAge(fundsLastP90)}</div></div>
              <div className="hf-summary-row"><div className="hf-summary-row-label">Median · funds last</div><div className="hf-summary-row-val gold">{fmtAge(fundsLastP50)}</div></div>
              <div className="hf-summary-row"><div className="hf-summary-row-label">Worst case · funds last</div><div className="hf-summary-row-val red">{fmtAge(fundsLastP10)}</div></div>
            </div>
          </div>

          {ctaSection}

        </div>
      </div>
    </>
  );
}

const safeSpendingStyles = `
  .ss-headline { background: rgba(201,168,76,0.08); border: 1px solid rgba(201,168,76,0.3); border-radius: 8px; padding: 28px 32px; margin-bottom: 24px; text-align: center; }
  .ss-headline-label { font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #c9a84c; font-weight: 500; margin-bottom: 10px; }
  .ss-headline-value { font-family: 'Playfair Display', serif; font-size: 52px; font-weight: 700; color: #c9a84c; line-height: 1; }
  .ss-headline-freq { font-size: 22px; font-weight: 400; color: rgba(201,168,76,0.6); }
  .ss-headline-sub { font-size: 14px; color: #8a9bb0; margin-top: 8px; font-weight: 300; }

  .ss-band-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
  .ss-band-card { border-radius: 6px; padding: 22px 20px; border: 1px solid; position: relative; overflow: hidden; }
  .ss-band-card::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px; }
  .ss-band-conservative { background: rgba(20,41,68,0.7); border-color: rgba(91,158,110,0.3); }
  .ss-band-conservative::after { background: #5b9e6e; }
  .ss-band-balanced { background: rgba(201,168,76,0.08); border-color: rgba(201,168,76,0.4); }
  .ss-band-balanced::after { background: #c9a84c; }
  .ss-band-aggressive { background: rgba(20,41,68,0.7); border-color: rgba(192,97,74,0.3); }
  .ss-band-aggressive::after { background: #e08878; }
  .ss-band-label { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #8a9bb0; font-weight: 500; margin-bottom: 8px; }
  .ss-band-value { font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 700; color: #f5f0e8; margin-bottom: 4px; }
  .ss-band-freq { font-size: 12px; color: #8a9bb0; margin-bottom: 8px; }
  .ss-band-prob { font-size: 11px; color: #8a9bb0; font-style: italic; }

  .ss-pension-card { display: flex; gap: 16px; align-items: flex-start; background: rgba(20,41,68,0.5); border: 1px solid rgba(201,168,76,0.15); border-radius: 6px; padding: 18px 20px; margin-bottom: 24px; }
  .ss-pension-icon { font-size: 22px; flex-shrink: 0; margin-top: 1px; }
  .ss-pension-title { font-size: 13px; font-weight: 600; color: #f5f0e8; margin-bottom: 4px; letter-spacing: 0.01em; }
  .ss-pension-body { font-size: 13px; color: #8a9bb0; line-height: 1.6; }
  .ss-pension-body strong { color: #c9a84c; font-weight: 500; }

  @media (max-width: 680px) {
    .ss-band-grid { grid-template-columns: 1fr; }
    .ss-headline-value { font-size: 38px; }
  }
`;

const baseStyles = `
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  .hf-root { font-family: 'DM Sans', sans-serif; background: #0d1f35; color: #f5f0e8; min-height: 100vh; position: relative; }

  .hf-root::before { content: ''; position: fixed; inset: 0; background-image: linear-gradient(rgba(201,168,76,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.02) 1px, transparent 1px); background-size: 60px 60px; pointer-events: none; z-index: 0; }

  .hf-nav { display: flex; align-items: center; justify-content: space-between; padding: 18px 40px; border-bottom: 1px solid rgba(201,168,76,0.1); background: rgba(13,31,53,0.95); backdrop-filter: blur(10px); position: sticky; top: 0; z-index: 100; }
  .hf-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
  .hf-logo-text { font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 600; color: #f5f0e8; letter-spacing: 0.04em; }
  .hf-nav-right { display: flex; align-items: center; gap: 12px; }

  .hf-btn-outline { background: transparent; border: 1px solid rgba(201,168,76,0.35); color: #c9a84c; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; padding: 8px 18px; border-radius: 3px; cursor: pointer; transition: all 0.2s; }
  .hf-btn-outline:hover { background: rgba(201,168,76,0.1); border-color: #c9a84c; }

  .hf-btn-gold { background: #c9a84c; border: none; color: #0d1f35; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; padding: 9px 20px; border-radius: 3px; cursor: pointer; transition: all 0.2s; }
  .hf-btn-gold:hover { background: #e8cc88; }

  .hf-save-banner { background: rgba(20,41,68,0.9); border-bottom: 1px solid rgba(201,168,76,0.2); padding: 16px 40px; position: relative; z-index: 10; }

  .hf-real-dollars-notice { background: rgba(201,168,76,0.06); border: 1px solid rgba(201,168,76,0.2); border-radius: 6px; padding: 10px 16px; margin-bottom: 24px; font-size: 13px; color: #8a9bb0; line-height: 1.5; }
  .hf-real-dollars-notice strong { color: #c9a84c; }
  .hf-save-banner-inner { max-width: 1000px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
  .hf-save-banner-title { font-size: 15px; font-weight: 500; color: #f5f0e8; margin-bottom: 3px; }
  .hf-save-banner-sub { font-size: 13px; color: #8a9bb0; font-weight: 300; }
  .hf-save-banner-btns { display: flex; gap: 10px; flex-shrink: 0; }
  .hf-btn-outline-light { background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #8a9bb0; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; padding: 9px 18px; border-radius: 3px; cursor: pointer; transition: all 0.2s; }
  .hf-btn-outline-light:hover { color: #f5f0e8; border-color: rgba(255,255,255,0.4); }

  .hf-page { max-width: 1000px; margin: 0 auto; padding: 40px 24px 80px; position: relative; z-index: 1; }

  .hf-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; flex-wrap: wrap; gap: 16px; }
  .hf-title { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 700; color: #f5f0e8; line-height: 1.2; }
  .hf-title em { color: #e8cc88; font-style: italic; }
  .hf-meta { font-size: 13px; color: #8a9bb0; margin-top: 6px; font-weight: 300; }
  .hf-meta span { color: #f5f0e8; }
  .hf-recalc-btn { background: transparent; border: 1px solid rgba(201,168,76,0.2); color: #8a9bb0; font-family: 'DM Sans', sans-serif; font-size: 13px; padding: 8px 16px; border-radius: 3px; cursor: pointer; transition: all 0.2s; }
  .hf-recalc-btn:hover { border-color: #c9a84c; color: #c9a84c; }

  .hf-stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
  .hf-stat-card { background: rgba(20,41,68,0.7); border: 1px solid rgba(201,168,76,0.15); border-radius: 6px; padding: 24px 20px; backdrop-filter: blur(10px); position: relative; overflow: hidden; transition: border-color 0.2s; }
  .hf-stat-card:hover { border-color: rgba(201,168,76,0.35); }
  .hf-stat-card::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px; }
  .hf-stat-gold::after { background: #c9a84c; }
  .hf-stat-green::after { background: #5b9e6e; }
  .hf-stat-blue::after { background: #4a90d9; }
  .hf-stat-label { font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #8a9bb0; margin-bottom: 10px; font-weight: 500; }
  .hf-stat-value { font-family: 'Playfair Display', serif; font-size: 34px; font-weight: 700; color: #f5f0e8; line-height: 1; margin-bottom: 6px; }
  .hf-stat-value.gold { color: #c9a84c; }
  .hf-stat-value.green { color: #7ec896; }
  .hf-stat-value.blue { color: #7ab8f0; }
  .hf-stat-sub { font-size: 12px; color: #8a9bb0; font-weight: 300; line-height: 1.5; }

  .hf-chart-section { background: rgba(20,41,68,0.7); border: 1px solid rgba(201,168,76,0.15); border-radius: 8px; padding: 28px; backdrop-filter: blur(10px); margin-bottom: 28px; }
  .hf-chart-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
  .hf-chart-title { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 600; color: #f5f0e8; }
  .hf-chart-legend { display: flex; gap: 20px; flex-wrap: wrap; }
  .hf-legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #8a9bb0; }
  .hf-legend-line { width: 24px; display: inline-block; }
  .hf-chart-wrap { position: relative; height: 320px; }
  .hf-chart-note { font-size: 11px; color: #8a9bb0; margin-top: 14px; text-align: right; font-style: italic; }

  .hf-summary-section { background: rgba(20,41,68,0.5); border: 1px solid rgba(201,168,76,0.12); border-left: 3px solid #c9a84c; border-radius: 0 6px 6px 0; padding: 28px 32px; margin-bottom: 28px; }
  .hf-summary-label { font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #c9a84c; font-weight: 500; margin-bottom: 14px; }
  .hf-summary-text { font-size: 16px; line-height: 1.75; color: #f5f0e8; font-weight: 300; }
  .hf-summary-text strong { color: #f5f0e8; font-weight: 500; }
  .hf-summary-rows { margin-top: 20px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .hf-summary-row { background: rgba(13,31,53,0.5); border: 1px solid rgba(201,168,76,0.1); border-radius: 4px; padding: 14px 16px; }
  .hf-summary-row-label { font-size: 11px; color: #8a9bb0; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px; }
  .hf-summary-row-val { font-family: 'Playfair Display', serif; font-size: 17px; font-weight: 600; }
  .hf-summary-row-val.green { color: #7ec896; }
  .hf-summary-row-val.gold  { color: #c9a84c; }
  .hf-summary-row-val.red   { color: #e08878; }

  .hf-bottom-cta { background: rgba(20,41,68,0.7); border: 1px solid rgba(201,168,76,0.2); border-radius: 8px; padding: 36px 40px; margin-bottom: 28px; text-align: center; }
  .hf-bottom-cta-title { font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 600; color: #f5f0e8; margin-bottom: 10px; }
  .hf-bottom-cta-sub { font-size: 15px; color: #8a9bb0; font-weight: 300; line-height: 1.6; margin-bottom: 24px; max-width: 520px; margin-left: auto; margin-right: auto; }
  .hf-bottom-cta-btns { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  .hf-cta-btn-gold { background: #c9a84c; border: none; color: #0d1f35; font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
  .hf-cta-btn-gold:hover { background: #e8cc88; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(201,168,76,0.3); }
  .hf-cta-btn-outline { background: transparent; border: 1px solid rgba(201,168,76,0.3); color: #c9a84c; font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 500; padding: 14px 32px; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
  .hf-cta-btn-outline:hover { background: rgba(201,168,76,0.08); }

  .hf-disclaimer { margin-top: 32px; font-size: 11px; color: rgba(138,155,176,0.5); text-align: center; line-height: 1.7; max-width: 700px; margin-left: auto; margin-right: auto; }

  .spinner { display: inline-block; width: 24px; height: 24px; border: 2px solid rgba(201,168,76,0.2); border-top-color: #c9a84c; border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 680px) {
    .hf-nav { padding: 16px 20px; }
    .hf-page { padding: 24px 16px 60px; }
    .hf-stat-grid { grid-template-columns: 1fr; }
    .hf-title { font-size: 24px; }
    .hf-stat-value { font-size: 28px; }
    .hf-chart-wrap { height: 240px; }
    .hf-summary-rows { grid-template-columns: 1fr; }
    .hf-save-banner { padding: 14px 20px; }
    .hf-save-banner-inner { flex-direction: column; gap: 12px; }
    .hf-bottom-cta { padding: 24px 20px; }
  }
`;
