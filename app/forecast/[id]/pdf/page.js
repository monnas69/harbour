'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

const A = (v) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(v ?? 0);
const K = (v) => { if (!v && v !== 0) return '—'; if (v >= 1e6) return '$' + (v/1e6).toFixed(2).replace(/\.?0+$/,'')+'m'; if (v >= 1e3) return '$'+Math.round(v/1e3)+'k'; return '$'+Math.round(v); };
const deflate = (v, yrs, r=0.025) => (!v || yrs<=0) ? v : Math.round(v / Math.pow(1+r, yrs));

export default function ForecastPdfPage() {
  const { id } = useParams();
  const router = useRouter();
  const [fc, setFc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const sb = createClient();
        const { data: { session } } = await sb.auth.getSession();
        if (!session) { router.push('/auth/login'); return; }
        const { data, error } = await sb.from('forecasts').select('*').eq('id', id).single();
        if (error || !data) throw new Error('Forecast not found.');
        setFc(data);
      } catch (e) { setErr(e.message); }
      finally { setLoading(false); }
    })();
  }, [id, router]);

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontFamily:'sans-serif',color:'#666'}}>Loading…</div>;
  if (err) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',fontFamily:'sans-serif',color:'#c00'}}>{err}</div>;

  const inp = fc.inputs || {};
  const out = fc.outputs || {};
  const name       = fc.name?.trim() || inp.name?.trim() || 'Client';
  const curAge     = inp.current_age;
  const supBal     = inp.super_balance;
  const retAge     = inp.retirement_age;
  const spend      = inp.annual_spending;
  const salary     = inp.salary || 0;
  const salsac     = inp.salary_sacrifice || 0;
  const ncc        = inp.ncc || 0;
  const isSafe     = (inp.mode || 'traditional') === 'safe_spending';
  const horizon    = out.target_horizon || inp.target_horizon || 90;
  const ytr        = retAge - curAge;
  const retBal     = deflate(out.retirement_balance_median, ytr);
  const penAnnual  = out.pension_annual || 0;
  const penFn      = penAnnual ? Math.round(penAnnual/26) : 0;
  const penFromAge = out.pension_eligible_from_age;
  const flP10      = out.funds_last_p10;
  const flP50      = out.funds_last_p50;
  const flP90      = out.funds_last_p90;
  const safeCons   = out.safe_spending_conservative;
  const safeBal    = out.safe_spending_balanced;
  const safeAgg    = out.safe_spending_aggressive;
  const ages       = out.ages || [];
  const p10        = out.p10  || [];
  const p50        = out.p50  || [];
  const p90        = out.p90  || [];
  const spending   = isSafe ? safeBal : spend;
  const superIncome = spending - penAnnual > 0 ? spending - penAnnual : 0;
  const createdAt  = new Date(fc.created_at).toLocaleDateString('en-AU', {day:'numeric',month:'long',year:'numeric'});
  const refNo      = String(id).slice(0,8).toUpperCase();
  const sgAnnual   = salary ? Math.round(salary * 0.12) : 0;
  const totalContr = sgAnnual + salsac + ncc;
  // milestone ages for projection table — every 5 years between curAge and horizon
  const tableAges = [];
  for (let a = curAge; a <= Math.max(horizon, flP90 || horizon); a++) {
    if (a === curAge || a === retAge || a === 67 || a % 5 === 0 || a === horizon || a === flP50) tableAges.push(a);
  }
  const uniq = [...new Set(tableAges)].sort((a,b)=>a-b);

  return (<>
    <style>{CSS}</style>
    <div className="doc">

      {/* ── COVER ── */}
      <div className="page cover">
        <div className="cover-rule" />
        <div className="cover-label">RETIREMENT FORECAST REPORT</div>
        <div className="cover-name">{name}</div>
        <div className="cover-meta">
          <span>Prepared {createdAt}</span>
          <span>Reference&nbsp;{refNo}</span>
          <span>{isSafe ? 'Safe Spending Mode' : 'Traditional Mode'}</span>
        </div>
        <div className="cover-rule" style={{marginTop:40}} />
        <div className="cover-stats">
          {[
            ['Current age', curAge],
            ['Retirement age', retAge],
            ['Target horizon', 'Age '+horizon],
            ['Current super', K(supBal)],
            ['Ret. balance (est.)', K(retBal)],
            [isSafe ? 'Balanced spending' : 'Spending target', K(spending)],
            ['Age Pension (p.a.)', penAnnual > 0 ? K(penAnnual) : 'Not eligible at 67'],
            ['Funds last to', 'Age '+(flP50||'—')],
          ].map(([l,v]) => (
            <div key={l} className="cover-stat">
              <div className="cover-stat-l">{l}</div>
              <div className="cover-stat-v">{v}</div>
            </div>
          ))}
        </div>
        <div className="cover-rule" />
        <div className="cover-footer">Prepared by Harbour · harbour.finance · General information only — not financial advice</div>
      </div>

      {/* ── PAGE 2: EXECUTIVE SUMMARY ── */}
      <div className="page">
        <div className="page-hd"><span>Executive Summary</span><span>{name} · {refNo}</span></div>

        <div className="section-title">Retirement at a Glance</div>
        <table className="kv-table"><tbody>
          <tr><td>Projected super balance at retirement (age {retAge}, median, today's $)</td><td className="val">{K(retBal)}</td></tr>
          <tr><td>Nominal projected balance at retirement (before inflation adjustment)</td><td className="val">{K(out.retirement_balance_median)}</td></tr>
          <tr><td>{isSafe ? 'Recommended annual spending — balanced scenario' : 'Target annual retirement spending'}</td><td className="val">{K(spending)}</td></tr>
          <tr><td>Estimated annual Age Pension entitlement (current Centrelink rates)</td><td className="val">{penAnnual > 0 ? A(Math.round(penAnnual/100)*100) : 'Not eligible at age 67'}</td></tr>
          {penAnnual > 0 && <tr><td>Age Pension (fortnightly)</td><td className="val">{A(penFn)}</td></tr>}
          {penFromAge && penAnnual === 0 && <tr><td>Estimated age at which pension becomes payable (as balance depletes)</td><td className="val">Age {penFromAge}</td></tr>}
          <tr><td>Estimated annual super drawdown required (spending less pension)</td><td className="val">{K(superIncome)}</td></tr>
          <tr><td>Pension as share of total retirement income</td><td className="val">{spending > 0 && penAnnual > 0 ? Math.round(penAnnual/spending*100)+'%' : '0%'}</td></tr>
        </tbody></table>

        <div className="section-title" style={{marginTop:28}}>Outcome Range — When Do Funds Run Out?</div>
        <table className="data-table"><thead><tr>
          <th>Scenario</th><th>Percentile</th><th>Description</th><th>Funds last to</th>
        </tr></thead><tbody>
          <tr><td>Pessimistic</td><td>10th %ile</td><td>Poor investment returns over retirement</td><td className="val">{flP10 ? 'Age '+flP10 : '—'}</td></tr>
          <tr className="hl"><td><b>Median</b></td><td><b>50th %ile</b></td><td><b>Expected (average) outcome</b></td><td className="val"><b>{flP50 ? 'Age '+flP50 : '—'}</b></td></tr>
          <tr><td>Optimistic</td><td>90th %ile</td><td>Strong investment returns over retirement</td><td className="val">{flP90 ? 'Age '+flP90 : '—'}</td></tr>
        </tbody></table>

        {isSafe && (<>
          <div className="section-title" style={{marginTop:28}}>Safe Spending Scenarios</div>
          <table className="data-table"><thead><tr>
            <th>Scenario</th><th>Annual</th><th>Monthly</th><th>Fortnightly</th><th>Weekly</th>
          </tr></thead><tbody>
            <tr><td>Conservative</td><td className="val">{K(safeCons)}</td><td className="val">{K(safeCons&&Math.round(safeCons/12))}</td><td className="val">{K(safeCons&&Math.round(safeCons/26))}</td><td className="val">{K(safeCons&&Math.round(safeCons/52))}</td></tr>
            <tr className="hl"><td><b>Balanced</b></td><td className="val"><b>{K(safeBal)}</b></td><td className="val"><b>{K(safeBal&&Math.round(safeBal/12))}</b></td><td className="val"><b>{K(safeBal&&Math.round(safeBal/26))}</b></td><td className="val"><b>{K(safeBal&&Math.round(safeBal/52))}</b></td></tr>
            <tr><td>Aggressive</td><td className="val">{K(safeAgg)}</td><td className="val">{K(safeAgg&&Math.round(safeAgg/12))}</td><td className="val">{K(safeAgg&&Math.round(safeAgg/26))}</td><td className="val">{K(safeAgg&&Math.round(safeAgg/52))}</td></tr>
          </tbody></table>
          <p className="footnote">All figures in today's dollars. Includes estimated Age Pension from age 67 where applicable. Balanced scenario targets funds lasting to age {horizon}.</p>
        </>)}

        {!isSafe && (<>
          <div className="section-title" style={{marginTop:28}}>Annual Income Gap Analysis</div>
          <table className="kv-table"><tbody>
            <tr><td>Target annual spending</td><td className="val">{K(spend)}</td></tr>
            <tr><td>Less: estimated Age Pension (annual)</td><td className="val">{K(penAnnual)}</td></tr>
            <tr><td>Required annual super drawdown</td><td className="val">{K(superIncome)}</td></tr>
            <tr><td>Drawdown as % of retirement balance (median)</td><td className="val">{retBal > 0 ? (superIncome/retBal*100).toFixed(1)+'%' : '—'}</td></tr>
            {salary > 0 && <tr><td>Spending as % of pre-retirement salary (replacement rate)</td><td className="val">{(spend/salary*100).toFixed(0)+'%'}</td></tr>}
          </tbody></table>
        </>)}
      </div>

      {/* ── PAGE 3: PROJECTED BALANCE TABLE ── */}
      <div className="page">
        <div className="page-hd"><span>Projected Super Balance by Age</span><span>{name} · {refNo}</span></div>
        <p className="intro">Median (50th percentile) and range projections expressed in today's dollars (deflated at 2.5% p.a. inflation). Shaded rows mark key milestones.</p>

        <table className="data-table proj-table"><thead><tr>
          <th>Age</th><th>Year</th>
          <th>Pessimistic (P10)</th><th>Median (P50)</th><th>Optimistic (P90)</th>
          <th>Note</th>
        </tr></thead><tbody>
          {uniq.map(age => {
            const idx = ages.indexOf(age);
            const yr  = new Date().getFullYear() + (age - curAge);
            const v10 = idx >= 0 ? deflate(p10[idx], age-curAge) : null;
            const v50 = idx >= 0 ? deflate(p50[idx], age-curAge) : null;
            const v90 = idx >= 0 ? deflate(p90[idx], age-curAge) : null;
            const note = age === retAge ? 'Retirement' : age === 67 ? 'Pension eligibility' : age === horizon ? 'Target horizon' : age === flP50 ? 'Median funds exhaust' : '';
            const isKey = age === retAge || age === 67 || age === horizon;
            return (
              <tr key={age} className={isKey ? 'hl' : ''}>
                <td>{age}</td>
                <td style={{color:'#888'}}>{yr}</td>
                <td className="val">{v10 && v10 > 0 ? K(v10) : v10 === 0 ? '$0' : '—'}</td>
                <td className="val"><b>{v50 && v50 > 0 ? K(v50) : v50 === 0 ? '$0' : '—'}</b></td>
                <td className="val">{v90 && v90 > 0 ? K(v90) : v90 === 0 ? '$0' : '—'}</td>
                <td style={{color:'#888',fontSize:11}}>{note}</td>
              </tr>
            );
          })}
        </tbody></table>
        <p className="footnote">Projections use Monte Carlo simulation (1,000 paths). P10 = poor returns, P50 = median, P90 = strong returns. All values in today's dollars. Super balance drops to $0 once funds are exhausted and does not go negative — Age Pension income continues after this point.</p>
      </div>

      {/* ── PAGE 4: INPUTS, ASSUMPTIONS & DISCLAIMER ── */}
      <div className="page">
        <div className="page-hd"><span>Inputs, Assumptions &amp; Methodology</span><span>{name} · {refNo}</span></div>

        <div className="two-col">
          <div>
            <div className="section-title">Your Inputs</div>
            <table className="kv-table"><tbody>
              <tr><td>Name</td><td className="val">{name}</td></tr>
              <tr><td>Current age</td><td className="val">{curAge}</td></tr>
              <tr><td>Retirement age</td><td className="val">{retAge}</td></tr>
              <tr><td>Target horizon</td><td className="val">Age {horizon}</td></tr>
              <tr><td>Current super balance</td><td className="val">{A(supBal)}</td></tr>
              {!isSafe && <tr><td>Annual spending target</td><td className="val">{A(spend)}</td></tr>}
              {isSafe && <tr><td>Forecast mode</td><td className="val">Safe Spending</td></tr>}
              {salary > 0 && <tr><td>Current salary</td><td className="val">{A(salary)}</td></tr>}
              {salary > 0 && <tr><td>SGC contributions (12% p.a.)</td><td className="val">{A(sgAnnual)}</td></tr>}
              {salsac > 0 && <tr><td>Salary sacrifice (annual)</td><td className="val">{A(salsac)}</td></tr>}
              {ncc > 0 && <tr><td>Non-concessional contributions</td><td className="val">{A(ncc)}</td></tr>}
              {totalContr > 0 && <tr><td>Total annual contributions</td><td className="val">{A(totalContr)}</td></tr>}
            </tbody></table>
          </div>
          <div>
            <div className="section-title">Model Assumptions</div>
            <table className="kv-table"><tbody>
              <tr><td>Gross investment return</td><td className="val">7.0% p.a.</td></tr>
              <tr><td>Investment management fees</td><td className="val">0.5% p.a.</td></tr>
              <tr><td>Net investment return (accumulation)</td><td className="val">6.5% p.a.</td></tr>
              <tr><td>CPI inflation</td><td className="val">2.5% p.a.</td></tr>
              <tr><td>Real return (approx.)</td><td className="val">4.0% p.a.</td></tr>
              <tr><td>Monte Carlo simulations</td><td className="val">1,000 paths</td></tr>
              <tr><td>SGC rate</td><td className="val">12.0%</td></tr>
              <tr><td>Tax treatment</td><td className="val">Accumulation phase to retirement; pension phase from retirement age</td></tr>
              <tr><td>Age Pension</td><td className="val">Current Centrelink rates, assets & income tests</td></tr>
              <tr><td>Pension indexation</td><td className="val">Indexed to CPI annually</td></tr>
              <tr><td>Report currency</td><td className="val">AUD, today's dollars unless stated</td></tr>
            </tbody></table>
          </div>
        </div>

        <div className="section-title" style={{marginTop:28}}>Key Definitions</div>
        <table className="data-table"><thead><tr><th>Term</th><th>Definition</th></tr></thead>
        <tbody>
          <tr><td>Today's dollars</td><td>Nominal future values deflated to present purchasing power using 2.5% p.a. inflation</td></tr>
          <tr><td>P10 / Pessimistic</td><td>10th percentile of simulation outcomes — 90% of simulated paths perform better than this</td></tr>
          <tr><td>P50 / Median</td><td>50th percentile — half of simulated paths finish above, half below</td></tr>
          <tr><td>P90 / Optimistic</td><td>90th percentile — only 10% of simulated paths perform better than this</td></tr>
          <tr><td>Safe Spending</td><td>Maximum sustainable annual withdrawal calibrated to target age at chosen confidence level</td></tr>
          <tr><td>Funds last to</td><td>The age at which the super balance reaches zero under each scenario</td></tr>
        </tbody></table>

        <div className="disclaimer">
          <b>Important Disclaimer.</b> This report has been prepared by Harbour for general information purposes only. It does not constitute financial product advice and should not be relied upon as such. The projections contained in this report are estimates based on modelled assumptions and historical data — they are not guaranteed outcomes. Actual results will differ due to market movements, changes in legislation, tax rules, Centrelink means test thresholds, and personal circumstances. Superannuation and social security laws change regularly. You should always verify your personal entitlements with Services Australia and seek advice from a licensed financial adviser (AFS licensee) before making any retirement-related financial decisions. Past performance is not indicative of future performance. Harbour is not a licensed financial advice provider.
        </div>

        <div className="page-footer">
          <span>Harbour · harbour.finance</span>
          <span>Reference {refNo} · Generated {createdAt}</span>
          <span>General information only — not financial advice</span>
        </div>
      </div>

    </div>

    <div className="no-print controls">
      <button onClick={() => window.print()}>Print / Save as PDF</button>
      <button onClick={() => router.back()} style={{background:'#fff',color:'#333',border:'1px solid #ccc'}}>← Back</button>
    </div>
  </>);
}

const CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #e8e8e8; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; }
.doc { max-width: 860px; margin: 0 auto; padding: 32px 16px 100px; }

.page {
  background: #fff;
  padding: 64px 72px;
  margin-bottom: 24px;
  min-height: 1123px;
  position: relative;
  box-shadow: 0 1px 4px rgba(0,0,0,0.12);
}

/* Cover */
.cover { display: flex; flex-direction: column; }
.cover-rule { height: 2px; background: #b8963c; margin: 0; }
.cover-label { font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: #888; margin: 28px 0 32px; }
.cover-name { font-family: Georgia, 'Times New Roman', serif; font-size: 52px; font-weight: normal; color: #1a1a1a; line-height: 1.1; margin-bottom: 20px; }
.cover-meta { display: flex; gap: 32px; font-size: 12px; color: #888; margin-bottom: 40px; }
.cover-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin: 28px 0; border: 1px solid #e0e0e0; }
.cover-stat { padding: 16px 20px; border-bottom: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0; }
.cover-stat:nth-child(even) { border-right: none; }
.cover-stat:nth-last-child(-n+2) { border-bottom: none; }
.cover-stat-l { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin-bottom: 5px; }
.cover-stat-v { font-size: 20px; font-family: Georgia, serif; color: #1a1a1a; }
.cover-footer { font-size: 10px; color: #aaa; margin-top: 28px; text-align: center; letter-spacing: 0.04em; }

/* Page header */
.page-hd { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px; margin-bottom: 28px; }
.page-hd > span:first-child { font-family: Georgia, serif; font-size: 20px; color: #1a1a1a; }
.page-hd > span:last-child { font-size: 11px; color: #888; }

.section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.13em; color: #b8963c; border-bottom: 1px solid #e8e8e8; padding-bottom: 6px; margin-bottom: 12px; margin-top: 4px; font-weight: 600; }
.intro { font-size: 12.5px; color: #555; line-height: 1.6; margin-bottom: 20px; }
.footnote { font-size: 10.5px; color: #888; margin-top: 12px; line-height: 1.6; }

/* Tables */
.kv-table { width: 100%; border-collapse: collapse; font-size: 12.5px; margin-bottom: 4px; }
.kv-table td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; color: #333; vertical-align: top; }
.kv-table td:first-child { color: #555; width: 68%; }

.data-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.data-table th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; padding: 7px 10px; font-weight: 500; background: #fafafa; }
.data-table td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; color: #333; vertical-align: top; }
.data-table tr:last-child td { border-bottom: 1px solid #ccc; }

.val { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; color: #1a1a1a; }
.hl td { background: #fdf8ee; }
.hl td.val { color: #8a6010; }

.proj-table th:nth-child(n+3), .proj-table td:nth-child(n+3) { text-align: right; }

/* Two-col layout */
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }

/* Disclaimer */
.disclaimer { margin-top: 28px; padding: 16px 18px; border: 1px solid #e0e0e0; background: #fafafa; font-size: 11px; color: #666; line-height: 1.75; }
.disclaimer b { color: #333; }

/* Footer */
.page-footer { position: absolute; bottom: 32px; left: 72px; right: 72px; display: flex; justify-content: space-between; font-size: 10px; color: #bbb; border-top: 1px solid #e8e8e8; padding-top: 10px; }

/* Controls */
.controls { position: fixed; bottom: 24px; right: 24px; display: flex; gap: 10px; z-index: 100; }
.controls button { padding: 10px 22px; background: #1a1a1a; color: #fff; border: none; font-size: 13px; cursor: pointer; font-family: inherit; }
.controls button:hover { background: #333; }

@media print {
  body { background: white; }
  .doc { max-width: 100%; padding: 0; }
  .page { box-shadow: none; margin-bottom: 0; padding: 20mm 24mm; min-height: 0; page-break-after: always; }
  .no-print { display: none !important; }
  .cover-name { font-size: 40px; }
}
`;

