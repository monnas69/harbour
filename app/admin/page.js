'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

// ── Section definitions ───────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: 'pension',
    title: 'Age Pension — single homeowner',
    keys: ['pension_base_single', 'pension_supplement_single', 'pension_energy_single'],
  },
  {
    id: 'assets',
    title: 'Assets test — single homeowner',
    keys: ['assets_lower_single_owner', 'assets_upper_single_owner', 'assets_taper_rate'],
  },
  {
    id: 'income',
    title: 'Income test',
    keys: ['income_free_area_single', 'income_reduction_rate'],
  },
  {
    id: 'deeming',
    title: 'Deeming rates',
    keys: ['deeming_rate_lower', 'deeming_threshold_single', 'deeming_rate_upper'],
  },
  {
    id: 'asfa',
    title: 'ASFA retirement standards',
    keys: ['asfa_comfortable_single', 'asfa_modest_single'],
  },
  {
    id: 'super',
    title: 'Superannuation — ATO',
    keys: ['sg_rate', 'transfer_balance_cap', 'concessional_cap', 'non_concessional_cap', 'drawdown_under_65', 'drawdown_65_74', 'drawdown_75_79', 'drawdown_80_84', 'drawdown_85_89', 'drawdown_90_plus'],
  },
  {
    id: 'model',
    icon: '⚙️',
    title: 'Simulation parameters',
    sub: 'Monte Carlo model assumptions — review annually',
    keys: ['return_accumulation', 'return_retirement', 'return_volatility', 'inflation_rate', 'fee_rate'],
  },
];

// Keys that display as percentages
const PCT_KEYS = new Set([
  'assets_taper_rate', 'income_reduction_rate',
  'deeming_rate_lower', 'deeming_rate_upper',
  'sg_rate', 'drawdown_under_65', 'drawdown_65_74', 'drawdown_75_79', 'drawdown_80_84', 'drawdown_85_89', 'drawdown_90_plus',
  'return_accumulation', 'return_retirement', 'return_volatility', 'inflation_rate',
  'fee_rate',
]);

// Keys that are fortnightly dollar amounts
const FN_KEYS = new Set([
  'pension_base_single', 'pension_supplement_single', 'pension_energy_single',
  'income_free_area_single', 'assets_taper_rate',
]);

// Keys that are annual dollar amounts
const YR_KEYS = new Set([
  'asfa_comfortable_single', 'asfa_modest_single',
  'concessional_cap', 'non_concessional_cap',
]);

const formatValue = (key, val) => {
  const n = parseFloat(val);
  if (isNaN(n)) return String(val);
  if (PCT_KEYS.has(key)) return n + '%';
  if (FN_KEYS.has(key)) return '$' + n.toFixed(2) + ' /fn';
  if (YR_KEYS.has(key)) return '$' + Math.round(n).toLocaleString('en-AU') + ' /yr';
  if (n >= 1000) return '$' + Math.round(n).toLocaleString('en-AU');
  return String(val);
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [config, setConfig]         = useState({});
  const [loading, setLoading]       = useState(true);
  const [editing, setEditing]       = useState(null);
  const [editVal, setEditVal]       = useState('');
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // ── Load config ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push('/auth/login'); return; }

        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
        if (adminEmail && session.user.email !== adminEmail) {
          router.push('/dashboard');
          return;
        }

        const { data: rows, error } = await supabase.from('config').select('*');
        if (error) { console.error('Config load error:', error); setLoading(false); return; }

        const map = {};
        rows.forEach(r => { map[r.key] = r; });
        setConfig(map);
        setLoading(false);
      } catch (err) {
        console.error('Admin load error:', err);
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Editing ──────────────────────────────────────────────────────────────────
  const startEdit = (key) => {
    setEditing(key);
    setEditVal(String(config[key]?.value ?? ''));
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditVal('');
  };

  const saveEdit = async (key) => {
    const val = parseFloat(editVal);
    if (isNaN(val)) { cancelEdit(); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: val }),
      });

      if (!res.ok) throw new Error('Save failed');

      const today = new Date().toISOString().split('T')[0];
      setConfig(prev => ({
        ...prev,
        [key]: { ...prev[key], value: val, last_updated: today },
      }));

      showToast('Saved — ' + (config[key]?.label || key));
      cancelEdit();
    } catch (err) {
      console.error('Save error:', err);
      showToast('Error saving — try again');
    } finally {
      setSaving(false);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  };

  // ── Pension total ──────────────────────────────────────────────────────────
  const pensionTotal = (
    (parseFloat(config['pension_base_single']?.value) || 0) +
    (parseFloat(config['pension_supplement_single']?.value) || 0) +
    (parseFloat(config['pension_energy_single']?.value) || 0)
  ).toFixed(2);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="adm-loading">
          <div className="adm-spinner" />
        </div>
      </>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>

      <div className="adm-root">

        {/* Nav */}
        <nav className="adm-nav">
          <div className="adm-nav-left">
            <a href="/dashboard" className="adm-logo">
              <svg width="22" height="22" viewBox="0 0 36 36" fill="none">
                <circle cx="18" cy="18" r="17" stroke="#c9a84c" strokeWidth="1.5"/>
                <line x1="18" y1="7" x2="18" y2="29" stroke="#c9a84c" strokeWidth="1.5"/>
                <line x1="11" y1="14" x2="25" y2="14" stroke="#c9a84c" strokeWidth="1.5"/>
                <path d="M11 29 Q18 24 25 29" stroke="#c9a84c" strokeWidth="1.5" fill="none"/>
              </svg>
              <span className="adm-logo-text">Harbour</span>
            </a>
            <span className="adm-badge">Admin</span>
          </div>
          <a href="/dashboard" className="adm-back-link">← Dashboard</a>
        </nav>

        {/* Main */}
        <main className="adm-main">

          <div className="adm-header">
            <h1 className="adm-title">Config</h1>
            <p className="adm-sub">Click any value to edit. Changes save immediately and take effect on the next forecast run.</p>
          </div>

          {SECTIONS.map(section => (
            <div key={section.id} className="adm-section">
              <div className="adm-section-label">{section.title}</div>
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th className="adm-th-value">Value</th>
                    <th className="adm-th-date">Last updated</th>
                  </tr>
                </thead>
                <tbody>
                  {section.keys.map(key => {
                    const row = config[key];
                    if (!row) return null;
                    const isEditingThis = editing === key;
                    const display = formatValue(key, row.value);

                    return (
                      <tr key={key} className={isEditingThis ? 'adm-row-editing' : ''}>
                        <td className="adm-td-label">
                          <div className="adm-field-name">{row.label || key}</div>
                          <div className="adm-field-key">{key}</div>
                        </td>
                        <td className="adm-td-value">
                          {!isEditingThis ? (
                            <div className="adm-value-pill" onClick={() => startEdit(key)}>
                              <span>{display}</span>
                              <span className="adm-pencil">✎</span>
                            </div>
                          ) : (
                            <div className="adm-edit-wrap">
                              <input
                                className="adm-input"
                                type="number"
                                step="any"
                                value={editVal}
                                onChange={e => setEditVal(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') saveEdit(key);
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                autoFocus
                              />
                              <button
                                className="adm-btn-save"
                                onClick={() => saveEdit(key)}
                                disabled={saving}
                              >
                                {saving ? '…' : 'Save'}
                              </button>
                              <button className="adm-btn-cancel" onClick={cancelEdit}>
                                Cancel
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="adm-td-date">{fmtDate(row.last_updated)}</td>
                      </tr>
                    );
                  })}

                  {/* Pension total — auto-calculated */}
                  {section.id === 'pension' && (
                    <tr className="adm-row-calculated">
                      <td className="adm-td-label">
                        <div className="adm-field-name">Total maximum</div>
                        <div className="adm-field-key">Sum of above three</div>
                      </td>
                      <td className="adm-td-value">
                        <div className="adm-value-pill adm-value-calculated">
                          <span>${parseFloat(pensionTotal).toLocaleString('en-AU', { minimumFractionDigits: 2 })} /fn</span>
                          <span className="adm-calculated-tag">auto</span>
                        </div>
                      </td>
                      <td className="adm-td-date">—</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}

        </main>

        {/* Toast */}
        <div className={`adm-toast${toastVisible ? ' adm-toast-visible' : ''}`}>
          ✓ {toast}
        </div>

      </div>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = `
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  .adm-root {
    font-family: 'DM Sans', sans-serif;
    background: #ffffff;
    color: #1a1a1a;
    min-height: 100vh;
    font-size: 14px;
  }

  .adm-loading {
    min-height: 100vh;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Nav */
  .adm-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 32px;
    border-bottom: 1px solid #e8e8e8;
    background: #ffffff;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .adm-nav-left { display: flex; align-items: center; gap: 14px; }

  .adm-logo {
    display: flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
  }

  .adm-logo-text {
    font-family: 'Playfair Display', serif;
    font-size: 17px;
    font-weight: 600;
    color: #0d1f35;
    letter-spacing: 0.04em;
  }

  .adm-badge {
    background: #f5f0e8;
    border: 1px solid #e0d8c8;
    color: #8a6e2e;
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: 20px;
    font-weight: 500;
  }

  .adm-back-link {
    font-size: 13px;
    color: #999;
    text-decoration: none;
    transition: color 0.15s;
  }
  .adm-back-link:hover { color: #0d1f35; }

  /* Main */
  .adm-main {
    max-width: 760px;
    margin: 0 auto;
    padding: 40px 32px 80px;
  }

  .adm-header { margin-bottom: 36px; }

  .adm-title {
    font-family: 'Playfair Display', serif;
    font-size: 26px;
    font-weight: 600;
    color: #0d1f35;
    margin-bottom: 6px;
  }

  .adm-sub {
    font-size: 13px;
    color: #888;
    line-height: 1.5;
  }

  /* Sections */
  .adm-section { margin-bottom: 40px; }

  .adm-section-label {
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #9a7d3a;
    margin-bottom: 10px;
    padding-left: 2px;
  }

  /* Table */
  .adm-table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid #e8e8e8;
    border-radius: 6px;
    overflow: hidden;
  }

  .adm-table thead tr {
    background: #f9f9f9;
    border-bottom: 1px solid #e8e8e8;
  }

  .adm-table th {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #aaa;
    padding: 9px 16px;
    text-align: left;
  }

  .adm-th-value { text-align: right; width: 200px; }
  .adm-th-date  { text-align: right; width: 130px; }

  .adm-table tbody tr {
    border-bottom: 1px solid #f0f0f0;
    transition: background 0.1s;
  }
  .adm-table tbody tr:last-child { border-bottom: none; }
  .adm-table tbody tr:hover { background: #fafafa; }

  .adm-row-editing { background: #fffdf5 !important; }
  .adm-row-calculated { opacity: 0.55; }

  .adm-td-label { padding: 13px 16px; }

  .adm-field-name {
    font-size: 13px;
    font-weight: 400;
    color: #1a1a1a;
    margin-bottom: 2px;
  }

  .adm-field-key {
    font-size: 11px;
    color: #ccc;
    font-family: 'DM Mono', 'Courier New', monospace;
  }

  .adm-td-value { padding: 10px 16px; text-align: right; }

  .adm-value-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: #ffffff;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    color: #0d1f35;
    transition: border-color 0.15s, background 0.15s;
    font-variant-numeric: tabular-nums;
  }
  .adm-value-pill:hover {
    border-color: #c9a84c;
    background: #fffdf7;
  }

  .adm-value-calculated { cursor: default; }
  .adm-value-calculated:hover {
    border-color: #e0e0e0;
    background: #ffffff;
  }

  .adm-pencil {
    font-size: 11px;
    color: #bbb;
    opacity: 0;
    transition: opacity 0.15s;
  }
  .adm-value-pill:hover .adm-pencil { opacity: 1; }

  .adm-calculated-tag {
    font-size: 10px;
    color: #c9a84c;
    letter-spacing: 0.05em;
  }

  /* Edit controls */
  .adm-edit-wrap {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    justify-content: flex-end;
  }

  .adm-input {
    width: 100px;
    text-align: right;
    font-size: 13px;
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    padding: 6px 10px;
    background: #ffffff;
    border: 1px solid #c9a84c;
    border-radius: 4px;
    color: #0d1f35;
    outline: none;
    box-shadow: 0 0 0 3px rgba(201,168,76,0.1);
  }

  .adm-btn-save {
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    background: #0d1f35;
    color: #ffffff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .adm-btn-save:hover:not(:disabled) { background: #1a3352; }
  .adm-btn-save:disabled { opacity: 0.4; cursor: not-allowed; }

  .adm-btn-cancel {
    padding: 5px 10px;
    font-size: 12px;
    font-family: 'DM Sans', sans-serif;
    background: transparent;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    color: #888;
    cursor: pointer;
    transition: color 0.15s, border-color 0.15s;
  }
  .adm-btn-cancel:hover {
    color: #1a1a1a;
    border-color: #aaa;
  }

  .adm-td-date {
    padding: 13px 16px;
    text-align: right;
    font-size: 12px;
    color: #bbb;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  /* Toast */
  .adm-toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 999;
    background: #ffffff;
    border: 1px solid #c8e6c9;
    color: #2e7d32;
    font-size: 13px;
    padding: 10px 18px;
    border-radius: 5px;
    opacity: 0;
    transform: translateY(6px);
    transition: opacity 0.2s, transform 0.2s;
    pointer-events: none;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }
  .adm-toast-visible {
    opacity: 1;
    transform: translateY(0);
  }

  /* Spinner */
  .adm-spinner {
    width: 32px;
    height: 32px;
    border: 2px solid #e8e8e8;
    border-top-color: #0d1f35;
    border-radius: 50%;
    animation: adm-spin 0.7s linear infinite;
  }
  @keyframes adm-spin { to { transform: rotate(360deg); } }

  /* Mobile */
  @media (max-width: 600px) {
    .adm-nav { padding: 12px 16px; }
    .adm-main { padding: 28px 16px 60px; }
    .adm-th-date, .adm-td-date { display: none; }
  }
`;
