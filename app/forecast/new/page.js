'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

// ─── ASFA Standards (matches config seeded values) ───────────────────────────
const ASFA_COMFORTABLE = 51000;
const ASFA_MODEST = 36000;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatCurrency = (val) => {
  if (!val && val !== 0) return '';
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(val);
};

const parseCurrency = (str) => {
  const num = parseFloat(str.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? '' : num;
};

const annualToFortnightly = (annual) => Math.round((annual / 26) * 100) / 100;
const fortnightlyToAnnual = (fn) => Math.round(fn * 26 * 100) / 100;

const sgFortnightly = (salary) => {
  if (!salary) return null;
  return (salary * 0.12) / 26;
};

const sgAnnual = (salary) => {
  if (!salary) return null;
  return salary * 0.12;
};

// ─── Step config ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'About you',     shortLabel: '01' },
  { id: 2, label: 'Current age',   shortLabel: '02' },
  { id: 3, label: 'Your super',    shortLabel: '03' },
  { id: 4, label: 'Retirement',    shortLabel: '04' },
  { id: 5, label: 'Spending',      shortLabel: '05' },
  { id: 6, label: 'Confirm',       shortLabel: '06' },
];

export default function ForecastInputPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [direction, setDirection] = useState('forward'); // for animation

  const [form, setForm] = useState({
    name: '',
    currentAge: '',
    superBalance: '',
    superBalanceDisplay: '',
    salary: '',
    salaryDisplay: '',
    retirementAge: '',
    spendingAnnual: '',
    spendingFortnightly: '',
    spendingAnnualDisplay: '',
    spendingFortnightlyDisplay: '',
  });

  // Validation per step
  const stepErrors = () => {
    if (step === 1) {
      if (!form.name.trim()) return 'Please enter your name.';
    }
    if (step === 2) {
      const age = parseInt(form.currentAge);
      if (!form.currentAge || isNaN(age)) return 'Please enter your current age.';
      if (age < 25 || age > 85) return 'Age must be between 25 and 85.';
    }
    if (step === 3) {
      const bal = parseCurrency(form.superBalanceDisplay);
      if (!form.superBalanceDisplay || bal === '') return 'Please enter your super balance.';
      if (bal < 0) return 'Balance cannot be negative.';
    }
    if (step === 4) {
      const retAge = parseInt(form.retirementAge);
      const curAge = parseInt(form.currentAge);
      if (!form.retirementAge || isNaN(retAge)) return 'Please enter your target retirement age.';
      if (retAge <= curAge) return `Retirement age must be greater than your current age (${curAge}).`;
      if (retAge > 75) return 'Retirement age cannot exceed 75 for now.';
    }
    if (step === 5) {
      const annual = parseCurrency(form.spendingAnnualDisplay);
      if (!form.spendingAnnualDisplay || annual === '') return 'Please enter your target retirement spending.';
      if (annual < 1000) return 'Annual spending seems too low. Please check.';
    }
    return null;
  };

  const goNext = () => {
    const err = stepErrors();
    if (err) { setError(err); return; }
    setError('');
    setDirection('forward');
    setStep(s => s + 1);
  };

  const goBack = () => {
    setError('');
    setDirection('back');
    setStep(s => s - 1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && step < 6) goNext();
  };

  // ── Field helpers ────────────────────────────────────────────────────────────
  const setField = (key, value) => {
    setForm(f => ({ ...f, [key]: value }));
    setError('');
  };

  const handleSuperBalance = (raw) => {
    const num = parseCurrency(raw);
    setForm(f => ({ ...f, superBalanceDisplay: raw, superBalance: num === '' ? '' : num }));
    setError('');
  };

  const handleSuperBalanceBlur = () => {
    if (form.superBalance !== '') {
      setForm(f => ({ ...f, superBalanceDisplay: formatCurrency(f.superBalance) }));
    }
  };

  const handleSalary = (raw) => {
    const num = parseCurrency(raw);
    setForm(f => ({ ...f, salaryDisplay: raw, salary: num === '' ? '' : num }));
    setError('');
  };

  const handleSalaryBlur = () => {
    if (form.salary !== '') {
      setForm(f => ({ ...f, salaryDisplay: formatCurrency(f.salary) }));
    }
  };

  const handleSpendingAnnual = (raw) => {
    const num = parseCurrency(raw);
    const fn = num !== '' ? annualToFortnightly(num) : '';
    setForm(f => ({
      ...f,
      spendingAnnualDisplay: raw,
      spendingAnnual: num === '' ? '' : num,
      spendingFortnightly: fn,
      spendingFortnightlyDisplay: fn !== '' ? formatCurrency(fn) : '',
    }));
    setError('');
  };

  const handleSpendingFortnightly = (raw) => {
    const num = parseCurrency(raw);
    const annual = num !== '' ? fortnightlyToAnnual(num) : '';
    setForm(f => ({
      ...f,
      spendingFortnightlyDisplay: raw,
      spendingFortnightly: num === '' ? '' : num,
      spendingAnnual: annual,
      spendingAnnualDisplay: annual !== '' ? formatCurrency(annual) : '',
    }));
    setError('');
  };

  const handleSpendingAnnualBlur = () => {
    if (form.spendingAnnual !== '') {
      setForm(f => ({ ...f, spendingAnnualDisplay: formatCurrency(f.spendingAnnual) }));
    }
  };

  const handleSpendingFortnightlyBlur = () => {
    if (form.spendingFortnightly !== '') {
      setForm(f => ({ ...f, spendingFortnightlyDisplay: formatCurrency(f.spendingFortnightly) }));
    }
  };

  const setAsfaPreset = (annual) => {
    const fn = annualToFortnightly(annual);
    setForm(f => ({
      ...f,
      spendingAnnual: annual,
      spendingAnnualDisplay: formatCurrency(annual),
      spendingFortnightly: fn,
      spendingFortnightlyDisplay: formatCurrency(fn),
    }));
    setError('');
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/auth/login');
        return;
      }

      const payload = {
        name: form.name.trim(),
        current_age: parseInt(form.currentAge),
        super_balance: parseFloat(form.superBalance),
        retirement_age: parseInt(form.retirementAge),
        annual_spending: parseFloat(form.spendingAnnual),
        salary: form.salary ? parseFloat(form.salary) : null,
      };

      const res = await fetch('/api/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Forecast failed. Please try again.');
      }

      const data = await res.json();
      // Redirect to forecast results page with the forecast id
      router.push(`/forecast/${data.id}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────────
  const sgAmount = sgFortnightly(form.salary);
  const yearsToRetirement = form.currentAge && form.retirementAge
    ? parseInt(form.retirementAge) - parseInt(form.currentAge)
    : null;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

        :root {
          --navy:  #0D1F35;
          --navy2: #162d4a;
          --gold:  #C9A84C;
          --gold-light: #dfc07a;
          --cream: #F5F0E8;
          --cream2: #ece5d6;
          --text:  #0D1F35;
          --muted: #5a6e82;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: 'DM Sans', sans-serif;
          background: var(--cream);
          color: var(--text);
          min-height: 100vh;
        }

        .harbour-wrap {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 280px 1fr;
          background: var(--cream);
        }

        /* ─── Sidebar ─────────────────────────────────────────── */
        .sidebar {
          background: var(--navy);
          display: flex;
          flex-direction: column;
          padding: 48px 32px;
          position: sticky;
          top: 0;
          height: 100vh;
        }

        .sidebar-logo {
          font-family: 'Playfair Display', serif;
          font-size: 28px;
          color: var(--gold);
          letter-spacing: 0.02em;
          margin-bottom: 8px;
        }

        .sidebar-tagline {
          font-size: 12px;
          color: rgba(255,255,255,0.45);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 56px;
        }

        .step-list {
          list-style: none;
          flex: 1;
        }

        .step-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 0;
          cursor: default;
          transition: all 0.2s;
        }

        .step-num {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.04em;
          flex-shrink: 0;
          transition: all 0.3s;
          border: 1.5px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.35);
        }

        .step-item.done .step-num {
          background: var(--gold);
          border-color: var(--gold);
          color: var(--navy);
        }

        .step-item.active .step-num {
          background: transparent;
          border-color: var(--gold);
          color: var(--gold);
          box-shadow: 0 0 0 3px rgba(201,168,76,0.15);
        }

        .step-label {
          font-size: 13px;
          font-weight: 400;
          color: rgba(255,255,255,0.3);
          transition: color 0.2s;
          letter-spacing: 0.01em;
        }

        .step-item.done .step-label  { color: rgba(255,255,255,0.55); }
        .step-item.active .step-label { color: #fff; font-weight: 500; }

        .sidebar-foot {
          font-size: 11px;
          color: rgba(255,255,255,0.2);
          line-height: 1.6;
          border-top: 1px solid rgba(255,255,255,0.08);
          padding-top: 24px;
        }

        /* ─── Main area ───────────────────────────────────────── */
        .main {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 64px 72px;
          min-height: 100vh;
          max-width: 640px;
        }

        .step-heading {
          font-family: 'Playfair Display', serif;
          font-size: 36px;
          font-weight: 700;
          color: var(--navy);
          line-height: 1.2;
          margin-bottom: 10px;
        }

        .step-sub {
          font-size: 15px;
          color: var(--muted);
          margin-bottom: 40px;
          line-height: 1.5;
          font-weight: 400;
        }

        /* ─── Inputs ──────────────────────────────────────────── */
        .field-group {
          margin-bottom: 24px;
        }

        .field-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 10px;
        }

        .field-input {
          width: 100%;
          padding: 16px 20px;
          font-family: 'DM Sans', sans-serif;
          font-size: 18px;
          font-weight: 400;
          background: #fff;
          border: 2px solid var(--cream2);
          border-radius: 10px;
          color: var(--navy);
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          -webkit-appearance: none;
          appearance: none;
        }

        .field-input:focus {
          border-color: var(--gold);
          box-shadow: 0 0 0 4px rgba(201,168,76,0.12);
        }

        .field-input::placeholder { color: #bbb; }

        .field-hint {
          margin-top: 7px;
          font-size: 13px;
          color: var(--muted);
        }

        /* ─── Two-col row ─────────────────────────────────────── */
        .field-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }

        /* ─── Bidirectional spend ─────────────────────────────── */
        .spend-grid {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 16px;
          margin-bottom: 12px;
        }

        .spend-divider {
          font-size: 13px;
          color: var(--muted);
          text-align: center;
          white-space: nowrap;
        }

        /* ─── ASFA presets ────────────────────────────────────── */
        .preset-row {
          display: flex;
          gap: 10px;
          margin-bottom: 24px;
        }

        .preset-btn {
          flex: 1;
          padding: 14px 16px;
          border: 2px solid var(--cream2);
          border-radius: 10px;
          background: #fff;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
        }

        .preset-btn:hover {
          border-color: var(--gold);
          background: rgba(201,168,76,0.05);
        }

        .preset-btn.active {
          border-color: var(--gold);
          background: rgba(201,168,76,0.08);
        }

        .preset-name {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 4px;
        }

        .preset-amount {
          font-size: 17px;
          font-weight: 600;
          color: var(--navy);
          font-family: 'DM Sans', sans-serif;
        }

        .preset-freq {
          font-size: 11px;
          color: var(--muted);
          margin-top: 2px;
        }

        /* ─── SG callout ──────────────────────────────────────── */
        .sg-callout {
          background: rgba(201,168,76,0.08);
          border: 1.5px solid rgba(201,168,76,0.3);
          border-radius: 10px;
          padding: 16px 20px;
          margin-top: -8px;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .sg-icon {
          font-size: 22px;
          flex-shrink: 0;
        }

        .sg-text {
          font-size: 14px;
          color: var(--navy);
          line-height: 1.4;
        }

        .sg-text strong {
          color: #8a6c1a;
          font-weight: 600;
        }

        /* ─── Review card ─────────────────────────────────────── */
        .review-card {
          background: #fff;
          border: 2px solid var(--cream2);
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 28px;
        }

        .review-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 20px;
          border-bottom: 1px solid var(--cream2);
          font-size: 14px;
        }

        .review-row:last-child { border-bottom: none; }

        .review-key {
          color: var(--muted);
          font-weight: 400;
        }

        .review-val {
          font-weight: 600;
          color: var(--navy);
          text-align: right;
        }

        .review-section-head {
          background: var(--cream2);
          padding: 8px 20px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--muted);
        }

        /* ─── Nav buttons ─────────────────────────────────────── */
        .btn-row {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-top: 8px;
        }

        .btn-back {
          padding: 14px 24px;
          border: 2px solid var(--cream2);
          border-radius: 10px;
          background: transparent;
          color: var(--muted);
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-back:hover {
          border-color: var(--navy);
          color: var(--navy);
        }

        .btn-next {
          flex: 1;
          padding: 16px 24px;
          background: var(--navy);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.25s;
          letter-spacing: 0.01em;
          position: relative;
          overflow: hidden;
        }

        .btn-next:hover:not(:disabled) {
          background: var(--navy2);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(13,31,53,0.25);
        }

        .btn-next:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-next.gold {
          background: var(--gold);
          color: var(--navy);
        }

        .btn-next.gold:hover:not(:disabled) {
          background: var(--gold-light);
        }

        /* ─── Error ───────────────────────────────────────────── */
        .error-msg {
          background: #fff0f0;
          border: 1.5px solid #fcc;
          border-radius: 8px;
          padding: 12px 16px;
          font-size: 14px;
          color: #c0392b;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        /* ─── Progress bar ────────────────────────────────────── */
        .progress-bar-wrap {
          height: 3px;
          background: var(--cream2);
          border-radius: 2px;
          margin-bottom: 48px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: var(--gold);
          border-radius: 2px;
          transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* ─── Loading spinner ─────────────────────────────────── */
        .spinner {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.4);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          margin-right: 8px;
          vertical-align: middle;
        }

        .spinner.dark {
          border-color: rgba(13,31,53,0.2);
          border-top-color: var(--navy);
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* ─── Optional field label ────────────────────────────── */
        .optional-tag {
          font-size: 11px;
          font-weight: 400;
          color: #aaa;
          text-transform: none;
          letter-spacing: 0;
          margin-left: 6px;
        }

        /* ─── Responsive ──────────────────────────────────────── */
        @media (max-width: 768px) {
          .harbour-wrap { grid-template-columns: 1fr; }
          .sidebar { display: none; }
          .main { padding: 40px 24px; max-width: 100%; }
          .step-heading { font-size: 28px; }
          .spend-grid { grid-template-columns: 1fr; }
          .spend-divider { display: none; }
        }
      `}</style>

      <div className="harbour-wrap">
        {/* ─── Sidebar ─────────────────────────────────────────── */}
        <aside className="sidebar">
          <div className="sidebar-logo">Harbour</div>
          <div className="sidebar-tagline">Retirement planning</div>

          <ul className="step-list">
            {STEPS.map((s) => {
              const status = s.id < step ? 'done' : s.id === step ? 'active' : '';
              return (
                <li key={s.id} className={`step-item ${status}`}>
                  <div className="step-num">
                    {s.id < step ? '✓' : s.shortLabel}
                  </div>
                  <span className="step-label">{s.label}</span>
                </li>
              );
            })}
          </ul>

          <div className="sidebar-foot">
            Projections only — not financial advice.<br />
            Powered by Monte Carlo simulation.
          </div>
        </aside>

        {/* ─── Main ────────────────────────────────────────────── */}
        <main className="main">
          {/* Progress */}
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }} />
          </div>

          {/* Error */}
          {error && (
            <div className="error-msg">
              <span>⚠</span> {error}
            </div>
          )}

          {/* ── Step 1: Name ──────────────────────────────────── */}
          {step === 1 && (
            <div onKeyDown={handleKeyDown}>
              <h1 className="step-heading">Let's start<br />with your name.</h1>
              <p className="step-sub">We'll use this to personalise your forecast — nothing else.</p>

              <div className="field-group">
                <label className="field-label">Your first name</label>
                <input
                  className="field-input"
                  type="text"
                  placeholder="e.g. Margaret"
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  autoFocus
                  autoComplete="given-name"
                />
              </div>

              <div className="btn-row">
                <button className="btn-next" onClick={goNext}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Current age ───────────────────────────── */}
          {step === 2 && (
            <div onKeyDown={handleKeyDown}>
              <h1 className="step-heading">How old are<br />you today?</h1>
              <p className="step-sub">We model your super growth from now until retirement.</p>

              <div className="field-group">
                <label className="field-label">Current age (years)</label>
                <input
                  className="field-input"
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 52"
                  min={40}
                  max={85}
                  value={form.currentAge}
                  onChange={e => setField('currentAge', e.target.value)}
                  autoFocus
                />
                <p className="field-hint">Must be between 25 and 85.</p>
              </div>

              <div className="btn-row">
                <button className="btn-back" onClick={goBack}>← Back</button>
                <button className="btn-next" onClick={goNext}>Continue →</button>
              </div>
            </div>
          )}

          {/* ── Step 3: Super balance ─────────────────────────── */}
          {step === 3 && (
            <div onKeyDown={handleKeyDown}>
              <h1 className="step-heading">Your super<br />balance today.</h1>
              <p className="step-sub">Check your latest super statement or fund app for the total across all funds.</p>

              <div className="field-group">
                <label className="field-label">Current super balance</label>
                <input
                  className="field-input"
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. $280,000"
                  value={form.superBalanceDisplay}
                  onChange={e => handleSuperBalance(e.target.value)}
                  onBlur={handleSuperBalanceBlur}
                  autoFocus
                />
              </div>

              <div className="field-group">
                <label className="field-label">
                  Annual salary <span className="optional-tag">(optional — for SG projection)</span>
                </label>
                <input
                  className="field-input"
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. $95,000"
                  value={form.salaryDisplay}
                  onChange={e => handleSalary(e.target.value)}
                  onBlur={handleSalaryBlur}
                />
                <p className="field-hint">Used to calculate your employer's 12% super contributions until retirement.</p>
              </div>

              {sgAmount !== null && (
                <div className="sg-callout">
                  <div className="sg-icon">💼</div>
                  <div className="sg-text">
Your employer is contributing approximately <strong>{formatCurrency(sgAmount)} per fortnight</strong> ({formatCurrency(sgAnnual(form.salary))} per year) to your super.                  </div>
                </div>
              )}

              <div className="btn-row">
                <button className="btn-back" onClick={goBack}>← Back</button>
                <button className="btn-next" onClick={goNext}>Continue →</button>
              </div>
            </div>
          )}

          {/* ── Step 4: Retirement age ────────────────────────── */}
          {step === 4 && (
            <div onKeyDown={handleKeyDown}>
              <h1 className="step-heading">When do you<br />want to retire?</h1>
              <p className="step-sub">
                The Age Pension becomes available at 67 regardless of when you stop working.
                {form.currentAge && <> You are currently {form.currentAge}.</>}
              </p>

              <div className="field-group">
                <label className="field-label">Target retirement age</label>
                <input
                  className="field-input"
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 65"
                  min={parseInt(form.currentAge) + 1 || 41}
                  max={75}
                  value={form.retirementAge}
                  onChange={e => setField('retirementAge', e.target.value)}
                  autoFocus
                />
                <p className="field-hint">
                  Must be older than {form.currentAge || 'your current age'} and no later than 75.
                </p>
              </div>

              {yearsToRetirement !== null && yearsToRetirement > 0 && (
                <div className="sg-callout">
                  <div className="sg-icon">📅</div>
                  <div className="sg-text">
                    That's <strong>{yearsToRetirement} year{yearsToRetirement !== 1 ? 's' : ''}</strong> until retirement.
                    {parseInt(form.retirementAge) < 67 && <> Your Age Pension will start at <strong>age 67</strong>, {67 - parseInt(form.retirementAge)} year{67 - parseInt(form.retirementAge) !== 1 ? 's' : ''} later.</>}
                    {parseInt(form.retirementAge) >= 67 && <> You'll be eligible for the Age Pension from the day you retire.</>}
                  </div>
                </div>
              )}

              <div className="btn-row">
                <button className="btn-back" onClick={goBack}>← Back</button>
                <button className="btn-next" onClick={goNext}>Continue →</button>
              </div>
            </div>
          )}

          {/* ── Step 5: Spending ──────────────────────────────── */}
          {step === 5 && (
            <div onKeyDown={handleKeyDown}>
              <h1 className="step-heading">How much will<br />you spend?</h1>
              <p className="step-sub">Enter your target retirement spending. Use the ASFA standards as a starting point.</p>

              {/* ASFA presets */}
              <div className="preset-row">
                <button
                  className={`preset-btn ${form.spendingAnnual === ASFA_COMFORTABLE ? 'active' : ''}`}
                  onClick={() => setAsfaPreset(ASFA_COMFORTABLE)}
                >
                  <div className="preset-name">ASFA Comfortable</div>
                  <div className="preset-amount">{formatCurrency(ASFA_COMFORTABLE)}</div>
                  <div className="preset-freq">{formatCurrency(annualToFortnightly(ASFA_COMFORTABLE))} per fortnight</div>
                </button>
                <button
                  className={`preset-btn ${form.spendingAnnual === ASFA_MODEST ? 'active' : ''}`}
                  onClick={() => setAsfaPreset(ASFA_MODEST)}
                >
                  <div className="preset-name">ASFA Modest</div>
                  <div className="preset-amount">{formatCurrency(ASFA_MODEST)}</div>
                  <div className="preset-freq">{formatCurrency(annualToFortnightly(ASFA_MODEST))} per fortnight</div>
                </button>
              </div>

              {/* Bidirectional inputs */}
              <div className="spend-grid">
                <div>
                  <label className="field-label">Annual spending</label>
                  <input
                    className="field-input"
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. $51,000"
                    value={form.spendingAnnualDisplay}
                    onChange={e => handleSpendingAnnual(e.target.value)}
                    onBlur={handleSpendingAnnualBlur}
                  />
                </div>
                <div className="spend-divider">↔</div>
                <div>
                  <label className="field-label">Per fortnight</label>
                  <input
                    className="field-input"
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. $1,962"
                    value={form.spendingFortnightlyDisplay}
                    onChange={e => handleSpendingFortnightly(e.target.value)}
                    onBlur={handleSpendingFortnightlyBlur}
                  />
                </div>
              </div>
              <p className="field-hint" style={{ marginTop: '-16px', marginBottom: '24px' }}>
                In today's dollars. Inflation (2.5% p.a.) is applied automatically in your forecast.
              </p>

              <div className="btn-row">
                <button className="btn-back" onClick={goBack}>← Back</button>
                <button className="btn-next" onClick={goNext}>Review →</button>
              </div>
            </div>
          )}

          {/* ── Step 6: Review & confirm ──────────────────────── */}
          {step === 6 && (
            <div>
              <h1 className="step-heading">Almost there,<br />{form.name}.</h1>
              <p className="step-sub">Check your details below. Hit "Run forecast" when you're ready.</p>

              <div className="review-card">
                <div className="review-section-head">Personal</div>
                <div className="review-row">
                  <span className="review-key">Name</span>
                  <span className="review-val">{form.name}</span>
                </div>
                <div className="review-row">
                  <span className="review-key">Current age</span>
                  <span className="review-val">{form.currentAge}</span>
                </div>

                <div className="review-section-head">Superannuation</div>
                <div className="review-row">
                  <span className="review-key">Current balance</span>
                  <span className="review-val">{formatCurrency(form.superBalance)}</span>
                </div>
                {form.salary && (
                  <div className="review-row">
                    <span className="review-key">Annual salary</span>
                    <span className="review-val">{formatCurrency(form.salary)}</span>
                  </div>
                )}
                {sgAmount !== null && (
                  <div className="review-row">
                    <span className="review-key">SG contributions</span>
                    <span className="review-val">{formatCurrency(sgAmount)}/fn ({formatCurrency(sgAmount * 26)}/yr)</span>
                  </div>
                )}

                <div className="review-section-head">Retirement plan</div>
                <div className="review-row">
                  <span className="review-key">Target retirement age</span>
                  <span className="review-val">{form.retirementAge}</span>
                </div>
                <div className="review-row">
                  <span className="review-key">Age Pension eligibility</span>
                  <span className="review-val">Age 67</span>
                </div>
                <div className="review-row">
                  <span className="review-key">Retirement spending</span>
                  <span className="review-val">{formatCurrency(form.spendingFortnightly)}/fn · {formatCurrency(form.spendingAnnual)}/yr</span>
                </div>

                <div className="review-section-head">Assumptions (defaults)</div>
                <div className="review-row">
                  <span className="review-key">Homeowner</span>
                  <span className="review-val">Yes</span>
                </div>
                <div className="review-row">
                  <span className="review-key">Relationship status</span>
                  <span className="review-val">Single</span>
                </div>
                <div className="review-row">
                  <span className="review-key">Modelled to age</span>
                  <span className="review-val">90</span>
                </div>
              </div>

              {error && (
                <div className="error-msg">
                  <span>⚠</span> {error}
                </div>
              )}

              <div className="btn-row">
                <button className="btn-back" onClick={goBack}>← Back</button>
                <button
                  className="btn-next gold"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <><span className="spinner dark" />Running forecast…</>
                  ) : (
                    'Run my forecast →'
                  )}
                </button>
              </div>

              <p style={{ marginTop: '20px', fontSize: '12px', color: '#999', lineHeight: '1.6' }}>
                This forecast is for general information purposes only and does not constitute financial advice. Results are projections based on modelled assumptions and are not guaranteed. Centrelink rules and superannuation laws change regularly — always verify your personal entitlements with Services Australia or a licensed financial adviser before making retirement decisions.
              </p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
