'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';

// ─── Contribution caps (current year — update 1 July each year) ──────────────
const CONCESSIONAL_CAP = 30000;
const NCC_CAP = 120000;

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

// ─── Step configs ─────────────────────────────────────────────────────────────
const PRE_RETIREE_STEPS = [
  { id: 1, label: 'About you',   shortLabel: '01' },
  { id: 2, label: 'Current age', shortLabel: '02' },
  { id: 3, label: 'Your super',  shortLabel: '03' },
  { id: 4, label: 'Retirement',  shortLabel: '04' },
  { id: 5, label: 'Spending',    shortLabel: '05' },
  { id: 6, label: 'Confirm',     shortLabel: '06' },
];

const RETIREE_STEPS = [
  { id: 1, label: 'About you',     shortLabel: '01' },
  { id: 2, label: 'Your situation', shortLabel: '02' },
  { id: 3, label: 'Your goal',     shortLabel: '03' },
  { id: 4, label: 'Confirm',       shortLabel: '04' },
];

// ─── Inner component (needs useSearchParams) ──────────────────────────────────
function ForecastInputInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read URL params set by the home page
  const urlMode    = searchParams.get('mode')    || 'traditional';
  const urlRetired = searchParams.get('retired') === 'true';

  const [isRetired,    setIsRetired]    = useState(urlRetired);
  const [step,         setStep]         = useState(1);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [forecastMode, setForecastMode] = useState(urlMode);
  const [targetHorizon, setTargetHorizon] = useState(90);

  // ─── ASFA values — loaded from config, fall back to known defaults ──────────
  const [asfaComfortable, setAsfaComfortable] = useState(51000);
  const [asfaModest,      setAsfaModest]      = useState(36000);

  const [form, setForm] = useState({
    name: '',
    currentAge: '',
    superBalance: '',
    superBalanceDisplay: '',
    salary: '',
    salaryDisplay: '',
    salarySacrifice: '',
    salarySacrificeDisplay: '',
    ncc: '',
    nccDisplay: '',
    retirementAge: '',
    spendingAnnual: '',
    spendingFortnightly: '',
    spendingAnnualDisplay: '',
    spendingFortnightlyDisplay: '',
    disclaimerAccepted: false,
  });

  useEffect(() => {
    async function loadAsfa() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('config')
          .select('key, value')
          .in('key', ['asfa_comfortable_single', 'asfa_modest_single']);
        if (data) {
          data.forEach(row => {
            if (row.key === 'asfa_comfortable_single') setAsfaComfortable(Number(row.value));
            if (row.key === 'asfa_modest_single')      setAsfaModest(Number(row.value));
          });
        }
      } catch {
        // Silently fall back to useState defaults
      }
    }
    loadAsfa();
  }, []);

  const STEPS = isRetired ? RETIREE_STEPS : PRE_RETIREE_STEPS;
  const totalSteps = STEPS.length;

  // ── Validation ───────────────────────────────────────────────────────────────
  const stepErrors = () => {
    // Step 1 — same for both flows
    if (step === 1) {
      if (!form.name.trim()) return 'Please enter your name.';
    }

    // Step 2 — age (both flows); balance also required for retirees
    if (step === 2) {
      const age = parseInt(form.currentAge);
      if (!form.currentAge || isNaN(age)) return 'Please enter your current age.';
      if (isRetired) {
        if (age < 50 || age > 85) return 'Age must be between 50 and 85.';
        const bal = parseCurrency(form.superBalanceDisplay);
        if (!form.superBalanceDisplay || bal === '') return 'Please enter your current super / investment balance.';
        if (bal < 0) return 'Balance cannot be negative.';
      } else {
        if (age < 25 || age > 85) return 'Age must be between 25 and 85.';
      }
    }

    // Pre-retiree steps 3–5
    if (!isRetired) {
      if (step === 3) {
        const bal = parseCurrency(form.superBalanceDisplay);
        if (!form.superBalanceDisplay || bal === '') return 'Please enter your super balance.';
        if (bal < 0) return 'Balance cannot be negative.';
      }
      if (step === 4) {
        const retAge = parseInt(form.retirementAge);
        const curAge = parseInt(form.currentAge);
        if (!form.retirementAge || isNaN(retAge)) return 'Please enter your target retirement age.';
        if (retAge < 60) return 'Retirement age must be at least 60. Super cannot be accessed before preservation age.';
        if (retAge <= curAge) return `Retirement age must be greater than your current age (${curAge}).`;
        if (retAge > 75) return 'Retirement age cannot exceed 75 for now.';
      }
      if (step === 5) {
        if (forecastMode === 'traditional') {
          const annual = parseCurrency(form.spendingAnnualDisplay);
          if (!form.spendingAnnualDisplay || annual === '') return 'Please enter your target retirement spending.';
          if (annual < 1000) return 'Annual spending seems too low. Please check.';
        }
      }
    }

    // Retiree step 3 — goal
    if (isRetired && step === 3) {
      if (forecastMode === 'traditional') {
        const annual = parseCurrency(form.spendingAnnualDisplay);
        if (!form.spendingAnnualDisplay || annual === '') return 'Please enter your current annual spending.';
        if (annual < 1000) return 'Annual spending seems too low. Please check.';
      }
    }

    return null;
  };

  const goNext = () => {
    const err = stepErrors();
    if (err) { setError(err); return; }
    setError('');
    setStep(s => s + 1);
  };

  const goBack = () => {
    setError('');
    setStep(s => s - 1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && step < totalSteps) goNext();
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
    if (form.superBalance !== '') setForm(f => ({ ...f, superBalanceDisplay: formatCurrency(f.superBalance) }));
  };

  const handleSalary = (raw) => {
    const num = parseCurrency(raw);
    setForm(f => ({ ...f, salaryDisplay: raw, salary: num === '' ? '' : num }));
    setError('');
  };
  const handleSalaryBlur = () => {
    if (form.salary !== '') setForm(f => ({ ...f, salaryDisplay: formatCurrency(f.salary) }));
  };

  const handleSalarySacrifice = (raw) => {
    const num = parseCurrency(raw);
    setForm(f => ({ ...f, salarySacrificeDisplay: raw, salarySacrifice: num === '' ? '' : num }));
    setError('');
  };
  const handleSalarySacrificeBlur = () => {
    if (form.salarySacrifice !== '') setForm(f => ({ ...f, salarySacrificeDisplay: formatCurrency(f.salarySacrifice) }));
  };

  const handleNcc = (raw) => {
    const num = parseCurrency(raw);
    setForm(f => ({ ...f, nccDisplay: raw, ncc: num === '' ? '' : num }));
    setError('');
  };
  const handleNccBlur = () => {
    if (form.ncc !== '') setForm(f => ({ ...f, nccDisplay: formatCurrency(f.ncc) }));
  };

  const handleSpendingAnnual = (raw) => {
    const num = parseCurrency(raw);
    const fn  = num !== '' ? annualToFortnightly(num) : '';
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
    const num    = parseCurrency(raw);
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
    if (form.spendingAnnual !== '') setForm(f => ({ ...f, spendingAnnualDisplay: formatCurrency(f.spendingAnnual) }));
  };
  const handleSpendingFortnightlyBlur = () => {
    if (form.spendingFortnightly !== '') setForm(f => ({ ...f, spendingFortnightlyDisplay: formatCurrency(f.spendingFortnightly) }));
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
    if (!form.disclaimerAccepted) {
      setError('Please read and accept the disclaimer to continue.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const base = {
        name:             form.name.trim(),
        current_age:      parseInt(form.currentAge),
        super_balance:    parseFloat(form.superBalance),
        // Retirees are already retired — use current age as retirement age
        retirement_age:   isRetired ? parseInt(form.currentAge) : parseInt(form.retirementAge),
        salary:           isRetired ? 0 : (form.salary ? parseFloat(form.salary) : 0),
        salary_sacrifice: isRetired ? 0 : (form.salarySacrifice ? parseFloat(form.salarySacrifice) : 0),
        ncc:              isRetired ? 0 : (form.ncc ? parseFloat(form.ncc) : 0),
      };

      let endpoint, payload;
      if (forecastMode === 'safe_spending') {
        endpoint = '/api/forecast/safe-spending';
        payload  = { ...base, target_horizon: targetHorizon };
      } else {
        endpoint = '/api/forecast';
        payload  = { ...base, annual_spending: parseFloat(form.spendingAnnual) };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        if (data.error === 'FORECAST_LIMIT_REACHED') {
          throw new Error('You\'ve reached the 3 forecast limit. Go to your dashboard and delete a forecast to save a new one.');
        }
        throw new Error(data.error || 'Forecast failed. Please try again.');
      }

      const data = await res.json();

      if (data.id) {
        router.push(`/forecast/${data.id}`);
        return;
      }

      sessionStorage.setItem('harbour_preview', JSON.stringify({
        inputs: { ...payload, mode: forecastMode },
        outputs: data,
      }));
      router.push('/forecast/preview');

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

  const totalConcessional = (sgAnnual(form.salary) || 0) + (parseFloat(form.salarySacrifice) || 0);
  const concessionalWarning = totalConcessional > CONCESSIONAL_CAP;
  const nccWarning = parseFloat(form.ncc) > NCC_CAP;

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
        body { font-family: 'DM Sans', sans-serif; background: var(--cream); color: var(--text); min-height: 100vh; }

        .harbour-wrap { min-height: 100vh; display: grid; grid-template-columns: 280px 1fr; background: var(--cream); }

        .sidebar { background: var(--navy); display: flex; flex-direction: column; padding: 48px 32px; position: sticky; top: 0; height: 100vh; }

        .sidebar-logo { font-family: 'Playfair Display', serif; font-size: 28px; color: var(--gold); letter-spacing: 0.02em; margin-bottom: 4px; text-decoration: none; display: flex; align-items: center; gap: 10px; }

        .sidebar-tagline { font-size: 12px; color: rgba(255,255,255,0.45); letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 56px; }

        .sidebar-flow-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 4px 12px; margin-bottom: 24px;
          background: rgba(201,168,76,0.12); border: 1px solid rgba(201,168,76,0.25);
          border-radius: 100px; font-size: 11px; color: #c9a84c;
          letter-spacing: 0.06em; text-transform: uppercase;
        }

        .step-list { list-style: none; flex: 1; }
        .step-item { display: flex; align-items: center; gap: 14px; padding: 12px 0; cursor: default; transition: all 0.2s; }
        .step-num { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; letter-spacing: 0.04em; flex-shrink: 0; transition: all 0.3s; border: 1.5px solid rgba(255,255,255,0.15); color: rgba(255,255,255,0.35); }
        .step-item.done .step-num { background: var(--gold); border-color: var(--gold); color: var(--navy); }
        .step-item.active .step-num { background: transparent; border-color: var(--gold); color: var(--gold); box-shadow: 0 0 0 3px rgba(201,168,76,0.15); }
        .step-label { font-size: 13px; font-weight: 400; color: rgba(255,255,255,0.3); transition: color 0.2s; letter-spacing: 0.01em; }
        .step-item.done .step-label  { color: rgba(255,255,255,0.55); }
        .step-item.active .step-label { color: #fff; font-weight: 500; }

        .sidebar-foot { font-size: 11px; color: rgba(255,255,255,0.2); line-height: 1.6; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 24px; }
        .sidebar-back-link { display: block; margin-bottom: 16px; font-size: 12px; color: rgba(255,255,255,0.3); text-decoration: none; transition: color 0.2s; }
        .sidebar-back-link:hover { color: rgba(255,255,255,0.6); }

        .main { display: flex; flex-direction: column; justify-content: center; padding: 64px 72px; min-height: 100vh; max-width: 640px; }

        .step-heading { font-family: 'Playfair Display', serif; font-size: 36px; font-weight: 700; color: var(--navy); line-height: 1.2; margin-bottom: 10px; }
        .step-sub { font-size: 15px; color: var(--muted); margin-bottom: 40px; line-height: 1.5; font-weight: 400; }

        .field-group { margin-bottom: 24px; }
        .field-label { display: block; font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; }
        .field-input { width: 100%; padding: 16px 20px; font-family: 'DM Sans', sans-serif; font-size: 18px; font-weight: 400; background: #fff; border: 2px solid var(--cream2); border-radius: 10px; color: var(--navy); outline: none; transition: border-color 0.2s, box-shadow 0.2s; -webkit-appearance: none; appearance: none; }
        .field-input:focus { border-color: var(--gold); box-shadow: 0 0 0 4px rgba(201,168,76,0.12); }
        .field-input::placeholder { color: #bbb; }
        .field-hint { margin-top: 7px; font-size: 13px; color: var(--muted); }

        .field-explainer { background: rgba(13,31,53,0.04); border-left: 3px solid var(--cream2); border-radius: 0 8px 8px 0; padding: 12px 16px; margin-bottom: 16px; font-size: 13px; color: var(--muted); line-height: 1.6; }
        .field-explainer strong { color: var(--navy); font-weight: 600; }

        .spend-grid { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 16px; margin-bottom: 12px; }
        .spend-divider { font-size: 13px; color: var(--muted); text-align: center; white-space: nowrap; }

        .preset-row { display: flex; gap: 10px; margin-bottom: 24px; }
        .preset-btn { flex: 1; padding: 14px 16px; border: 2px solid var(--cream2); border-radius: 10px; background: #fff; cursor: pointer; text-align: left; transition: all 0.2s; }
        .preset-btn:hover { border-color: var(--gold); background: rgba(201,168,76,0.05); }
        .preset-btn.active { border-color: var(--gold); background: rgba(201,168,76,0.08); }
        .preset-name { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin-bottom: 4px; }
        .preset-amount { font-size: 17px; font-weight: 600; color: var(--navy); font-family: 'DM Sans', sans-serif; }
        .preset-freq { font-size: 11px; color: var(--muted); margin-top: 2px; }

        .sg-callout { background: rgba(201,168,76,0.08); border: 1.5px solid rgba(201,168,76,0.3); border-radius: 10px; padding: 16px 20px; margin-top: -8px; margin-bottom: 24px; display: flex; align-items: center; gap: 14px; }
        .sg-icon { font-size: 22px; flex-shrink: 0; }
        .sg-text { font-size: 14px; color: var(--navy); line-height: 1.4; }
        .sg-text strong { color: #8a6c1a; font-weight: 600; }

        .warning-callout { background: rgba(180,100,40,0.07); border: 1.5px solid rgba(180,100,40,0.3); border-radius: 10px; padding: 14px 18px; margin-top: -8px; margin-bottom: 24px; display: flex; align-items: flex-start; gap: 12px; }
        .warning-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
        .warning-text { font-size: 13px; color: #7a4a1a; line-height: 1.5; }
        .warning-text strong { font-weight: 600; }

        .review-card { background: #fff; border: 2px solid var(--cream2); border-radius: 12px; overflow: hidden; margin-bottom: 28px; }
        .review-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; border-bottom: 1px solid var(--cream2); font-size: 14px; }
        .review-row:last-child { border-bottom: none; }
        .review-key { color: var(--muted); font-weight: 400; }
        .review-val { font-weight: 600; color: var(--navy); text-align: right; }
        .review-section-head { background: var(--cream2); padding: 8px 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }

        .disclaimer-box { background: rgba(13,31,53,0.04); border: 1.5px solid var(--cream2); border-radius: 10px; padding: 20px 24px; margin-bottom: 24px; }
        .disclaimer-box.accepted { border-color: rgba(201,168,76,0.5); background: rgba(201,168,76,0.05); }
        .disclaimer-label { display: flex; align-items: flex-start; gap: 14px; cursor: pointer; }
        .disclaimer-checkbox { margin-top: 2px; width: 18px; height: 18px; flex-shrink: 0; accent-color: var(--gold); cursor: pointer; }
        .disclaimer-text { font-size: 13px; color: var(--muted); line-height: 1.65; }
        .disclaimer-text strong { color: var(--navy); }

        .btn-row { display: flex; gap: 12px; align-items: center; margin-top: 8px; }
        .btn-back { padding: 14px 24px; border: 2px solid var(--cream2); border-radius: 10px; background: transparent; color: var(--muted); font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .btn-back:hover { border-color: var(--navy); color: var(--navy); }
        .btn-next { flex: 1; padding: 16px 24px; background: var(--navy); color: #fff; border: none; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.25s; letter-spacing: 0.01em; }
        .btn-next:hover:not(:disabled) { background: var(--navy2); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(13,31,53,0.25); }
        .btn-next:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
        .btn-next.gold { background: var(--gold); color: var(--navy); }
        .btn-next.gold:hover:not(:disabled) { background: var(--gold-light); }

        .error-msg { background: #fff0f0; border: 1.5px solid #fcc; border-radius: 8px; padding: 12px 16px; font-size: 14px; color: #c0392b; margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }

        .progress-bar-wrap { height: 3px; background: var(--cream2); border-radius: 2px; margin-bottom: 48px; overflow: hidden; }
        .progress-bar-fill { height: 100%; background: var(--gold); border-radius: 2px; transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1); }

        .spinner { display: inline-block; width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; margin-right: 8px; vertical-align: middle; }
        .spinner.dark { border-color: rgba(13,31,53,0.2); border-top-color: var(--navy); }
        @keyframes spin { to { transform: rotate(360deg); } }

        .optional-tag { font-size: 11px; font-weight: 400; color: #aaa; text-transform: none; letter-spacing: 0; margin-left: 6px; }
        .section-divider { border: none; border-top: 1px solid var(--cream2); margin: 8px 0 28px; }
        .hint-nudge { margin-top: 10px; font-size: 12px; color: #bbb; }

        /* Mode toggles */
        .mode-toggle { display: flex; gap: 0; margin-bottom: 32px; border: 2px solid var(--cream2); border-radius: 10px; overflow: hidden; }
        .mode-toggle-btn { flex: 1; padding: 14px 16px; border: none; background: #fff; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; color: var(--muted); transition: all 0.2s; text-align: center; line-height: 1.3; }
        .mode-toggle-btn.active { background: var(--navy); color: #fff; }
        .mode-toggle-btn:first-child { border-right: 1px solid var(--cream2); }

        /* Horizon buttons */
        .horizon-row { display: flex; gap: 10px; margin-bottom: 24px; }
        .horizon-btn { flex: 1; padding: 18px 12px; border: 2px solid var(--cream2); border-radius: 10px; background: #fff; cursor: pointer; text-align: center; transition: all 0.2s; font-family: 'DM Sans', sans-serif; }
        .horizon-btn:hover { border-color: var(--gold); background: rgba(201,168,76,0.05); }
        .horizon-btn.active { border-color: var(--gold); background: rgba(201,168,76,0.08); }
        .horizon-age { font-size: 24px; font-weight: 700; color: var(--navy); font-family: 'Playfair Display', serif; display: block; margin-bottom: 4px; }
        .horizon-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.07em; }

        /* Retiree info callout */
        .retiree-callout { background: rgba(74,144,217,0.07); border: 1.5px solid rgba(74,144,217,0.25); border-radius: 10px; padding: 14px 18px; margin-bottom: 24px; display: flex; align-items: flex-start; gap: 12px; font-size: 13px; color: #1a4a7a; line-height: 1.5; }

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
        {/* Sidebar */}
        <aside className="sidebar">
          <a href="/" className="sidebar-logo">
            <svg width="24" height="24" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="17" stroke="#c9a84c" strokeWidth="1.2"/>
              <line x1="18" y1="7" x2="18" y2="29" stroke="#c9a84c" strokeWidth="1.5"/>
              <line x1="11" y1="14" x2="25" y2="14" stroke="#c9a84c" strokeWidth="1.5"/>
              <path d="M11 29 Q18 24 25 29" stroke="#c9a84c" strokeWidth="1.5" fill="none"/>
            </svg>
            Harbour
          </a>
          <div className="sidebar-tagline">Retirement forecasting</div>

          <div className="sidebar-flow-badge">
            {isRetired ? '🧓 Already retired' : '🧑‍💼 Still working'}
          </div>

          <ul className="step-list">
            {STEPS.map((s) => {
              const status = s.id < step ? 'done' : s.id === step ? 'active' : '';
              return (
                <li key={s.id} className={`step-item ${status}`}>
                  <div className="step-num">{s.id < step ? '✓' : s.shortLabel}</div>
                  <span className="step-label">{s.label}</span>
                </li>
              );
            })}
          </ul>
          <a href="/" className="sidebar-back-link">← Back to home</a>
          <div className="sidebar-foot">
            Projections only — not financial advice.<br />
            Powered by Monte Carlo simulation.
          </div>
        </aside>

        <main className="main">
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }} />
          </div>

          {error && <div className="error-msg"><span>⚠</span> {error}</div>}

          {/* ── Step 1 — Name (same for both flows) ──────────────────────────── */}
          {step === 1 && (
            <div onKeyDown={handleKeyDown}>
              <h1 className="step-heading">Let's start<br />with your name.</h1>
              <p className="step-sub">We'll use this to personalise your forecast — nothing else.</p>
              <div className="field-group">
                <label className="field-label">Your first name</label>
                <input className="field-input" type="text" placeholder="e.g. Karen" value={form.name} onChange={e => setField('name', e.target.value)} autoFocus autoComplete="given-name" />
              </div>
              <div className="btn-row">
                <button className="btn-next" onClick={goNext}>Continue →</button>
              </div>
            </div>
          )}

          {/* ── Step 2 — RETIREE: age + balance ──────────────────────────────── */}
          {step === 2 && isRetired && (
            <div onKeyDown={handleKeyDown}>
              <h1 className="step-heading">Your current<br />situation.</h1>
              <p className="step-sub">Tell us where you're at today — we'll work with that.</p>

              <div className="retiree-callout">
                <span style={{ fontSize: 18 }}>ℹ️</span>
                <span>Since you're already retired, we'll skip salary and contributions — your balance and spending are what matter now.</span>
              </div>

              <div className="field-group">
                <label className="field-label">Current age (years)</label>
                <input className="field-input" type="number" inputMode="numeric" placeholder="e.g. 68" min={50} max={85} value={form.currentAge} onChange={e => setField('currentAge', e.target.value)} autoFocus />
                <p className="field-hint">Must be between 50 and 85.</p>
              </div>

              <div className="field-group">
                <label className="field-label">Current super / investment balance</label>
                <input className="field-input" type="text" inputMode="decimal" placeholder="e.g. $480,000" value={form.superBalanceDisplay} onChange={e => handleSuperBalance(e.target.value)} onBlur={handleSuperBalanceBlur} />
                <p className="field-hint">Total balance across all super funds and pension accounts. Check your latest statement.</p>
              </div>

              <div className="btn-row">
                <button className="btn-back" onClick={goBack}>← Back</button>
                <button className="btn-next" onClick={goNext}>Continue →</button>
              </div>
            </div>
          )}

          {/* ── Step 2 — PRE-RETIREE: age only ──────────────────────────────── */}
          {step === 2 && !isRetired && (
            <div onKeyDown={handleKeyDown}>
              <h1 className="step-heading">How old are<br />you today?</h1>
              <p className="step-sub">We model your super growth from now until retirement.</p>
              <div className="field-group">
                <label className="field-label">Current age (years)</label>
                <input className="field-input" type="number" inputMode="numeric" placeholder="e.g. 52" min={25} max={85} value={form.currentAge} onChange={e => setField('currentAge', e.target.value)} autoFocus />
                <p className="field-hint">Must be between 25 and 85.</p>
              </div>
              <div className="btn-row">
                <button className="btn-back" onClick={goBack}>← Back</button>
                <button className="btn-next" onClick={goNext}>Continue →</button>
              </div>
            </div>
          )}

          {/* ── Step 3 — RETIREE: goal (mode + spending or horizon) ───────────── */}
          {step === 3 && isRetired && (
            <div onKeyDown={handleKeyDown}>
              <h1 className="step-heading">What would you<br />like to know?</h1>
              <p className="step-sub">Choose what matters most to you right now.</p>

              {/* Mode toggle — retiree-specific labels */}
              <div className="mode-toggle">
                <button
                  className={`mode-toggle-btn${forecastMode === 'safe_spending' ? ' active' : ''}`}
                  onClick={() => setForecastMode('safe_spending')}
                >
                  How much can I safely spend?
                </button>
                <button
                  className={`mode-toggle-btn${forecastMode === 'traditional' ? ' active' : ''}`}
                  onClick={() => setForecastMode('traditional')}
                >
                  How long will my money last?
                </button>
              </div>

              {/* Safe spending: target horizon */}
              {forecastMode === 'safe_spending' && (
                <>
                  <div className="field-explainer" style={{ marginBottom: '20px' }}>
                    Using 1,000 Monte Carlo scenarios, we'll find the <strong>maximum annual spending</strong> such that your money is projected to last until your chosen age — including Age Pension entitlements and inflation.
                  </div>
                  <label className="field-label">I want my money to last until age</label>
                  <div className="horizon-row">
                    {[85, 90, 95].map(age => (
                      <button
                        key={age}
                        className={`horizon-btn${targetHorizon === age ? ' active' : ''}`}
                        onClick={() => setTargetHorizon(age)}
                      >
                        <span className="horizon-age">{age}</span>
                        <span className="horizon-label">{age === 85 ? 'Conservative' : age === 90 ? 'Standard' : 'Long-lived'}</span>
                      </button>
                    ))}
                  </div>
                  <p className="field-hint" style={{ marginBottom: '24px' }}>We'll return conservative, balanced, and optimistic spending estimates so you can see the full range.</p>
                </>
              )}

              {/* Traditional: spending inputs */}
              {forecastMode === 'traditional' && (
                <>
                  <div className="field-explainer" style={{ marginBottom: '20px' }}>
                    Enter what you currently spend and we'll project how long your money lasts across a range of market scenarios.
                  </div>
                  <div className="preset-row">
                    <button className={`preset-btn ${form.spendingAnnual === asfaComfortable ? 'active' : ''}`} onClick={() => setAsfaPreset(asfaComfortable)}>
                      <div className="preset-name">ASFA Comfortable</div>
                      <div className="preset-amount">{formatCurrency(asfaComfortable)}</div>
                      <div className="preset-freq">{formatCurrency(annualToFortnightly(asfaComfortable))} per fortnight</div>
                    </button>
                    <button className={`preset-btn ${form.spendingAnnual === asfaModest ? 'active' : ''}`} onClick={() => setAsfaPreset(asfaModest)}>
                      <div className="preset-name">ASFA Modest</div>
                      <div className="preset-amount">{formatCurrency(asfaModest)}</div>
                      <div className="preset-freq">{formatCurrency(annualToFortnightly(asfaModest))} per fortnight</div>
                    </button>
                  </div>
                  <div className="spend-grid">
                    <div>
                      <label className="field-label">Annual spending</label>
                      <input className="field-input" type="text" inputMode="decimal" placeholder={`e.g. ${formatCurrency(asfaComfortable)}`} value={form.spendingAnnualDisplay} onChange={e => handleSpendingAnnual(e.target.value)} onBlur={handleSpendingAnnualBlur} />
                    </div>
                    <div className="spend-divider">↔</div>
                    <div>
                      <label className="field-label">Per fortnight</label>
                      <input className="field-input" type="text" inputMode="decimal" placeholder="e.g. $1,962" value={form.spendingFortnightlyDisplay} onChange={e => handleSpendingFortnightly(e.target.value)} onBlur={handleSpendingFortnightlyBlur} />
                    </div>
                  </div>
                  <p className="field-hint" style={{ marginTop: '-16px', marginBottom: '24px' }}>In today's dollars. Inflation (2.5% p.a.) is applied automatically in your forecast.</p>
                </>
              )}

              <div className="btn-row">
                <button className="btn-back" onClick={goBack}>← Back</button>
                <button className="btn-next" onClick={goNext}>Review →</button>
              </div>
            </div>
          )}

          {/* ── Step 3 — PRE-RETIREE: super balance + contributions ───────────── */}
          {step === 3 && !isRetired && (
            <div onKeyDown={handleKeyDown}>
              <h1 className="step-heading">Your super<br />balance & contributions.</h1>
              <p className="step-sub">Enter your current balance and any contributions going into your super each year.</p>

              <div className="field-group">
                <label className="field-label">Current super balance</label>
                <input className="field-input" type="text" inputMode="decimal" placeholder="e.g. $280,000" value={form.superBalanceDisplay} onChange={e => handleSuperBalance(e.target.value)} onBlur={handleSuperBalanceBlur} autoFocus />
                <p className="field-hint">Check your latest super statement or fund app for the total across all funds.</p>
              </div>

              <hr className="section-divider" />

              <div className="field-group">
                <label className="field-label">Annual salary <span className="optional-tag">(optional)</span></label>
                <div className="field-explainer">
                  Your employer is required by law to contribute <strong>12% of your salary</strong> into your super — this is the <strong>Superannuation Guarantee (SG)</strong>. It's pre-tax money, taxed at <strong>15% on entry</strong>.
                </div>
                <input className="field-input" type="text" inputMode="decimal" placeholder="e.g. $95,000" value={form.salaryDisplay} onChange={e => handleSalary(e.target.value)} onBlur={handleSalaryBlur} />
                <p className="field-hint">Used to calculate your employer's 12% SG contributions until retirement.</p>
              </div>
              {sgAmount !== null && (
                <div className="sg-callout">
                  <div className="sg-icon">💼</div>
                  <div className="sg-text">Your employer is contributing approximately <strong>{formatCurrency(sgAmount)} per fortnight</strong> ({formatCurrency(sgAnnual(form.salary))} per year) to your super.</div>
                </div>
              )}

              <hr className="section-divider" />

              <div className="field-group">
                <label className="field-label">Salary sacrifice <span className="optional-tag">(optional)</span></label>
                <div className="field-explainer">
                  <strong>Salary sacrifice</strong> is extra super from your pre-tax salary — taxed at 15% on entry. Combined with SG, these count toward a <strong>concessional cap of {formatCurrency(CONCESSIONAL_CAP)}/yr</strong>.
                </div>
                <input className="field-input" type="text" inputMode="decimal" placeholder="e.g. $10,000" value={form.salarySacrificeDisplay} onChange={e => handleSalarySacrifice(e.target.value)} onBlur={handleSalarySacrificeBlur} />
                <p className="field-hint">Annual amount only — enter what you salary sacrifice per year.</p>
              </div>
              {concessionalWarning && (
                <div className="warning-callout">
                  <div className="warning-icon">⚠️</div>
                  <div className="warning-text">
                    <strong>Concessional cap check:</strong> Your combined SG ({formatCurrency(sgAnnual(form.salary))}/yr) and salary sacrifice ({formatCurrency(form.salarySacrifice)}/yr) total {formatCurrency(totalConcessional)}/yr — above the {formatCurrency(CONCESSIONAL_CAP)} cap.
                  </div>
                </div>
              )}

              <hr className="section-divider" />

              <div className="field-group">
                <label className="field-label">Non-concessional contributions <span className="optional-tag">(optional)</span></label>
                <div className="field-explainer">
                  <strong>Non-concessional contributions (NCC)</strong> are personal contributions from your after-tax savings — no tax on entry. Capped at <strong>{formatCurrency(NCC_CAP)}/yr</strong>.
                </div>
                <input className="field-input" type="text" inputMode="decimal" placeholder="e.g. $20,000" value={form.nccDisplay} onChange={e => handleNcc(e.target.value)} onBlur={handleNccBlur} />
                <p className="field-hint">Annual amount you plan to contribute from your own savings.</p>
              </div>
              {nccWarning && (
                <div className="warning-callout">
                  <div className="warning-icon">⚠️</div>
                  <div className="warning-text">
                    <strong>NCC cap check:</strong> Your non-concessional contributions ({formatCurrency(form.ncc)}/yr) exceed the {formatCurrency(NCC_CAP)}/yr cap. Excess NCC may be subject to additional tax.
                  </div>
                </div>
              )}

              <div className="btn-row">
                <button className="btn-back" onClick={goBack}>← Back</button>
                <button className="btn-next" onClick={goNext}>Continue →</button>
              </div>
            </div>
          )}

          {/* ── Step 4 — PRE-RETIREE: retirement age ─────────────────────────── */}
          {step === 4 && !isRetired && (
            <div onKeyDown={handleKeyDown}>
              <h1 className="step-heading">When do you<br />want to retire?</h1>
              <p className="step-sub">The Age Pension becomes available at 67 regardless of when you stop working.{form.currentAge && <> You are currently {form.currentAge}.</>}</p>
              <div className="field-group">
                <label className="field-label">Target retirement age</label>
                <input className="field-input" type="number" inputMode="numeric" placeholder="e.g. 65" min={60} max={75} value={form.retirementAge} onChange={e => setField('retirementAge', e.target.value)} autoFocus />
                <p className="field-hint">Must be between 60 and 75. Super cannot be accessed before preservation age (60).</p>
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

          {/* ── Step 4 — RETIREE: confirm ─────────────────────────────────────── */}
          {step === 4 && isRetired && (
            <div>
              <h1 className="step-heading">Almost there,<br />{form.name}.</h1>
              <p className="step-sub">Check your details below, read the disclaimer, then run your forecast.</p>

              <div className="review-card">
                <div className="review-section-head">Personal</div>
                <div className="review-row"><span className="review-key">Name</span><span className="review-val">{form.name}</span></div>
                <div className="review-row"><span className="review-key">Current age</span><span className="review-val">{form.currentAge}</span></div>
                <div className="review-section-head">Your balance</div>
                <div className="review-row"><span className="review-key">Super / investment balance</span><span className="review-val">{formatCurrency(form.superBalance)}</span></div>
                <div className="review-section-head">Your goal</div>
                <div className="review-row"><span className="review-key">Forecast type</span><span className="review-val">{forecastMode === 'safe_spending' ? 'Safe Spending' : 'How long will my money last?'}</span></div>
                {forecastMode === 'traditional'
                  ? <div className="review-row"><span className="review-key">Annual spending</span><span className="review-val">{formatCurrency(form.spendingFortnightly)}/fn · {formatCurrency(form.spendingAnnual)}/yr</span></div>
                  : <div className="review-row"><span className="review-key">Target funds-last age</span><span className="review-val">Age {targetHorizon}</span></div>
                }
                <div className="review-row"><span className="review-key">Age Pension eligibility</span><span className="review-val">Age 67</span></div>
                <div className="review-section-head">Assumptions (defaults)</div>
                <div className="review-row"><span className="review-key">Homeowner</span><span className="review-val">Yes</span></div>
                <div className="review-row"><span className="review-key">Relationship status</span><span className="review-val">Single</span></div>
                <div className="review-row"><span className="review-key">Modelled to age</span><span className="review-val">90</span></div>
              </div>

              <div className={`disclaimer-box${form.disclaimerAccepted ? ' accepted' : ''}`}>
                <label className="disclaimer-label">
                  <input type="checkbox" className="disclaimer-checkbox" checked={form.disclaimerAccepted} onChange={e => setField('disclaimerAccepted', e.target.checked)} />
                  <span className="disclaimer-text">
                    I understand that this forecast is for <strong>general information purposes only</strong> and does not constitute financial advice. Harbour does not hold an Australian Financial Services Licence (AFSL). Results are projections based on modelled assumptions — they are not guaranteed outcomes and should not be relied upon as a substitute for personalised advice from a licensed financial adviser.
                  </span>
                </label>
              </div>

              {error && <div className="error-msg"><span>⚠</span> {error}</div>}

              <div className="btn-row">
                <button className="btn-back" onClick={goBack}>← Back</button>
                <button className="btn-next gold" onClick={handleSubmit} disabled={loading || !form.disclaimerAccepted}>
                  {loading
                    ? <><span className="spinner dark" />{forecastMode === 'safe_spending' ? 'Calculating safe spending…' : 'Running forecast…'}</>
                    : forecastMode === 'safe_spending' ? 'Calculate safe spending →' : 'Run my forecast →'
                  }
                </button>
              </div>
              {!form.disclaimerAccepted && (
                <p className="hint-nudge">Please read and tick the disclaimer above to continue.</p>
              )}
            </div>
          )}

          {/* ── Step 5 — PRE-RETIREE: spending target or safe spending ────────── */}
          {step === 5 && !isRetired && (
            <div onKeyDown={handleKeyDown}>
              <h1 className="step-heading">
                {forecastMode === 'traditional' ? <>How much will<br />you spend?</> : <>Until what age should<br />your money last?</>}
              </h1>
              <p className="step-sub">
                {forecastMode === 'traditional'
                  ? 'Set a spending target and we project whether your super will last.'
                  : "We'll calculate the maximum you can safely spend each year in retirement."}
              </p>

              <div className="mode-toggle">
                <button className={`mode-toggle-btn${forecastMode === 'traditional' ? ' active' : ''}`} onClick={() => setForecastMode('traditional')}>
                  Set spending target
                </button>
                <button className={`mode-toggle-btn${forecastMode === 'safe_spending' ? ' active' : ''}`} onClick={() => setForecastMode('safe_spending')}>
                  Find my safe spending
                </button>
              </div>

              {forecastMode === 'traditional' && (
                <>
                  <div className="preset-row">
                    <button className={`preset-btn ${form.spendingAnnual === asfaComfortable ? 'active' : ''}`} onClick={() => setAsfaPreset(asfaComfortable)}>
                      <div className="preset-name">ASFA Comfortable</div>
                      <div className="preset-amount">{formatCurrency(asfaComfortable)}</div>
                      <div className="preset-freq">{formatCurrency(annualToFortnightly(asfaComfortable))} per fortnight</div>
                    </button>
                    <button className={`preset-btn ${form.spendingAnnual === asfaModest ? 'active' : ''}`} onClick={() => setAsfaPreset(asfaModest)}>
                      <div className="preset-name">ASFA Modest</div>
                      <div className="preset-amount">{formatCurrency(asfaModest)}</div>
                      <div className="preset-freq">{formatCurrency(annualToFortnightly(asfaModest))} per fortnight</div>
                    </button>
                  </div>
                  <div className="spend-grid">
                    <div>
                      <label className="field-label">Annual spending</label>
                      <input className="field-input" type="text" inputMode="decimal" placeholder={`e.g. ${formatCurrency(asfaComfortable)}`} value={form.spendingAnnualDisplay} onChange={e => handleSpendingAnnual(e.target.value)} onBlur={handleSpendingAnnualBlur} />
                    </div>
                    <div className="spend-divider">↔</div>
                    <div>
                      <label className="field-label">Per fortnight</label>
                      <input className="field-input" type="text" inputMode="decimal" placeholder="e.g. $1,962" value={form.spendingFortnightlyDisplay} onChange={e => handleSpendingFortnightly(e.target.value)} onBlur={handleSpendingFortnightlyBlur} />
                    </div>
                  </div>
                  <p className="field-hint" style={{ marginTop: '-16px', marginBottom: '24px' }}>In today's dollars. Inflation (2.5% p.a.) is applied automatically in your forecast.</p>
                </>
              )}

              {forecastMode === 'safe_spending' && (
                <>
                  <div className="field-explainer" style={{ marginBottom: '20px' }}>
                    Using 1,000 Monte Carlo scenarios, we'll find the <strong>maximum annual spending</strong> such that your super is projected to last until your chosen age — factoring in investment returns, the Age Pension, ATO drawdown rules, and inflation.
                  </div>
                  <label className="field-label">Target age for funds to last until</label>
                  <div className="horizon-row">
                    {[85, 90, 95].map(age => (
                      <button key={age} className={`horizon-btn${targetHorizon === age ? ' active' : ''}`} onClick={() => setTargetHorizon(age)}>
                        <span className="horizon-age">{age}</span>
                        <span className="horizon-label">{age === 85 ? 'Conservative' : age === 90 ? 'Standard' : 'Long-lived'}</span>
                      </button>
                    ))}
                  </div>
                  <p className="field-hint" style={{ marginBottom: '24px' }}>We'll return conservative, balanced, and optimistic spending estimates — so you can see the range.</p>
                </>
              )}

              <div className="btn-row">
                <button className="btn-back" onClick={goBack}>← Back</button>
                <button className="btn-next" onClick={goNext}>Review →</button>
              </div>
            </div>
          )}

          {/* ── Step 6 — PRE-RETIREE: confirm ────────────────────────────────── */}
          {step === 6 && !isRetired && (
            <div>
              <h1 className="step-heading">Almost there,<br />{form.name}.</h1>
              <p className="step-sub">Check your details below, read the disclaimer, then run your forecast.</p>

              <div className="review-card">
                <div className="review-section-head">Personal</div>
                <div className="review-row"><span className="review-key">Name</span><span className="review-val">{form.name}</span></div>
                <div className="review-row"><span className="review-key">Current age</span><span className="review-val">{form.currentAge}</span></div>
                <div className="review-section-head">Superannuation</div>
                <div className="review-row"><span className="review-key">Current balance</span><span className="review-val">{formatCurrency(form.superBalance)}</span></div>
                {form.salary && <div className="review-row"><span className="review-key">Annual salary</span><span className="review-val">{formatCurrency(form.salary)}</span></div>}
                {sgAmount !== null && <div className="review-row"><span className="review-key">SG contributions (after 15% tax)</span><span className="review-val">{formatCurrency(sgAmount * 0.85)}/fn · {formatCurrency(sgAnnual(form.salary) * 0.85)}/yr</span></div>}
                {form.salarySacrifice && <div className="review-row"><span className="review-key">Salary sacrifice (after 15% tax)</span><span className="review-val">{formatCurrency(parseFloat(form.salarySacrifice) * 0.85)}/yr</span></div>}
                {form.ncc && <div className="review-row"><span className="review-key">Non-concessional contributions</span><span className="review-val">{formatCurrency(form.ncc)}/yr</span></div>}
                <div className="review-section-head">Retirement plan</div>
                <div className="review-row"><span className="review-key">Forecast type</span><span className="review-val">{forecastMode === 'safe_spending' ? 'Safe Spending' : 'Traditional'}</span></div>
                <div className="review-row"><span className="review-key">Target retirement age</span><span className="review-val">{form.retirementAge}</span></div>
                <div className="review-row"><span className="review-key">Age Pension eligibility</span><span className="review-val">Age 67</span></div>
                {forecastMode === 'traditional'
                  ? <div className="review-row"><span className="review-key">Retirement spending</span><span className="review-val">{formatCurrency(form.spendingFortnightly)}/fn · {formatCurrency(form.spendingAnnual)}/yr</span></div>
                  : <div className="review-row"><span className="review-key">Target depletion age</span><span className="review-val">Age {targetHorizon}</span></div>
                }
                <div className="review-section-head">Assumptions (defaults)</div>
                <div className="review-row"><span className="review-key">Homeowner</span><span className="review-val">Yes</span></div>
                <div className="review-row"><span className="review-key">Relationship status</span><span className="review-val">Single</span></div>
                <div className="review-row"><span className="review-key">Modelled to age</span><span className="review-val">90</span></div>
              </div>

              <div className={`disclaimer-box${form.disclaimerAccepted ? ' accepted' : ''}`}>
                <label className="disclaimer-label">
                  <input type="checkbox" className="disclaimer-checkbox" checked={form.disclaimerAccepted} onChange={e => setField('disclaimerAccepted', e.target.checked)} />
                  <span className="disclaimer-text">
                    I understand that this forecast is for <strong>general information purposes only</strong> and does not constitute financial advice. Harbour does not hold an Australian Financial Services Licence (AFSL). Results are projections based on modelled assumptions — they are not guaranteed outcomes and should not be relied upon as a substitute for personalised advice from a licensed financial adviser. Centrelink rules, superannuation laws, and tax rates change regularly. I will verify my personal entitlements with Services Australia or a qualified adviser before making any retirement decisions.
                  </span>
                </label>
              </div>

              {error && <div className="error-msg"><span>⚠</span> {error}</div>}

              <div className="btn-row">
                <button className="btn-back" onClick={goBack}>← Back</button>
                <button
                  className="btn-next gold"
                  onClick={handleSubmit}
                  disabled={loading || !form.disclaimerAccepted}
                  title={!form.disclaimerAccepted ? 'Please read and accept the disclaimer above' : ''}
                >
                  {loading
                    ? <><span className="spinner dark" />{forecastMode === 'safe_spending' ? 'Calculating safe spending…' : 'Running forecast…'}</>
                    : forecastMode === 'safe_spending' ? 'Calculate safe spending →' : 'Run my forecast →'
                  }
                </button>
              </div>

              {!form.disclaimerAccepted && (
                <p className="hint-nudge">Please read and tick the disclaimer above to continue.</p>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

// ─── Suspense wrapper required for useSearchParams in Next.js App Router ──────
export default function ForecastInputPage() {
  return (
    <Suspense fallback={null}>
      <ForecastInputInner />
    </Suspense>
  );
}
