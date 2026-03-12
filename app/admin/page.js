'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

// ── Section definitions ───────────────────────────────────────────────────────
const SECTIONS = [
  {
    id: 'pension',
    icon: '🏛️',
    title: 'Age Pension rates',
    sub: 'Single homeowner — updated March and September each year',
    keys: ['pension_base_single', 'pension_supplement_single', 'pension_energy_single'],
  },
  {
    id: 'assets',
    icon: '🏠',
    title: 'Assets test thresholds',
    sub: 'Single homeowner thresholds — updated March and September',
    keys: ['assets_lower_single_owner', 'assets_upper_single_owner', 'assets_taper_rate'],
  },
  {
    id: 'income',
    icon: '📋',
    title: 'Income test',
    sub: 'Free area and reduction rate — updated March and September',
    keys: ['income_free_area_single', 'income_reduction_rate'],
  },
  {
    id: 'deeming',
    icon: '📊',
    title: 'Deeming rates',
    sub: 'Updated as announced — check budget.gov.au',
    keys: ['deeming_rate_lower', 'deeming_threshold_single', 'deeming_rate_upper'],
  },
  {
    id: 'asfa',
    icon: '🛒',
    title: 'ASFA retirement standards',
    sub: 'Updated quarterly — check asfa.asn.au each quarter',
    keys: ['asfa_comfortable_single', 'asfa_modest_single'],
  },
  {
    id: 'sg',
    icon: '💼',
    title: 'Superannuation Guarantee rate',
    sub: 'Legislated at 12% from 1 July 2025 — update only if legislation changes',
    keys: ['sg_rate'],
  },
  {
    id: 'super',
    icon: '🏦',
    title: 'Superannuation rules (ATO)',
    sub: 'Transfer balance cap and contribution caps updated annually — drawdown rates rarely change',
    keys: ['transfer_balance_cap', 'concessional_cap', 'non_concessional_cap', 'drawdown_under_65', 'drawdown_65_74', 'drawdown_75_79'],
  },
  {
    id: 'model',
    icon: '⚙️',
    title: 'Simulation parameters',
    sub: 'Monte Carlo model assumptions — review annually',
    keys: ['return_accumulation', 'return_retirement', 'return_volatility', 'inflation_rate'],
  },
];

// Keys that are percentages
const PCT_KEYS = new Set([
  'assets_taper_rate', 'income_reduction_rate',
  'deeming_rate_lower', 'deeming_rate_upper',
  'sg_rate', 'drawdown_under_65', 'drawdown_65_74', 'drawdown_75_79',
  'return_accumulation', 'return_retirement', 'return_volatility', 'inflation_rate',
]);

// Keys that are fortnightly dollar amounts
const FN_KEYS = new Set([
  'pension_base_single', 'pension_supplement_single', 'pension_energy_single',
  'income_free_area_single',
]);

const formatValue = (key, val) => {
  const n = parseFloat(val);
  if (PCT_KEYS.has(key)) return n + '%';
  if (FN_KEYS.has(key)) return '$' + n.toFixed(2) + ' /fn';
  if (n >= 1000) return '$' + Math.round(n).toLocaleString('en-AU');
  return String(val);
};

const dueBadgeClass = (nextDue) => {
  if (!nextDue) return 'adm-due-green';
  const d = new Date(nextDue);
  const now = new Date();
  const days = (d - now) / (1000 * 60 * 60 * 24);
  if (days < 0) return 'adm-due-red';
  if (days < 60) return 'adm-due-amber';
  return 'adm-due-green';
};

const dueBadgeText = (nextDue) => {
  if (!nextDue) return 'Stable';
  const d = new Date(nextDue);
  const now = new Date();
  const days = (d - now) / (1000 * 60 * 60 * 24);
  if (days < 0) return 'Overdue';
  if (days < 60) return 'Due ' + d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
  return 'Current';
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router  = useRouter();

  // ── Supabase client created at component level so it's available everywhere
  const supabase = createClient();

  const [config, setConfig]             = useState({});
  const [loading, setLoading]           = useState(true);
  const [editing, setEditing]           = useState(null);
  const [editVal, setEditVal]           = useState('');
  const [saving, setSaving]             = useState(false);
  const [openSections, setOpenSections] = useState(new Set(['pension']));
  const [activeSection, setActiveSection] = useState('pension');
  const [toast, setToast]               = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [log, setLog]                   = useState([]);
  const [lastSaved, setLastSaved]       = useState('');

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

        const { data: rows, error } = await supabase
          .from('config')
          .select('*');

        if (error) {
          console.error('Config load error:', error);
          setLoading(false);
          return;
        }

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

      const now = new Date().toISOString().split('T')[0];
      setConfig(prev => ({
        ...prev,
        [key]: { ...prev[key], value: val, last_updated: now },
      }));

      const label   = config[key]?.label || key;
      const display = formatValue(key, val);
      const dateStr = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
      setLog(prev => [{ label, display, dateStr, id: Date.now() }, ...prev]);

      showToast('Saved: ' + label + ' → ' + display);
      setLastSaved('Last saved ' + new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }));
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
    setTimeout(() => setToastVisible(false), 3000);
  };

  const toggleSection = (id) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const scrollToSection = (id) => {
    setActiveSection(id);
    const el = document.getElementById('section-' + id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (!openSections.has(id)) {
      setOpenSections(prev => new Set([...prev, id]));
    }
  };

  // ── Pension total ──────────────────────────────────────────────────────────
  const pensionTotal = (
    (parseFloat(config['pension_base_single']?.value) || 0) +
    (parseFloat(config['pension_supplement_single']?.value) || 0) +
    (parseFloat(config['pension_energy_single']?.value) || 0)
  ).toFixed(2);

  // ── Status summary ─────────────────────────────────────────────────────────
  const allNextDues = Object.values(config).map(r => r.next_due).filter(Boolean);
  const now = new Date();
  const dueSoon = allNextDues.filter(d => {
    const days = (new Date(d) - now) / (1000 * 60 * 60 * 24);
    return days >= 0 && days < 60;
  }).length;
  const upToDate = allNextDues.filter(d => {
    const days = (new Date(d) - now) / (1000 * 60 * 60 * 24);
    return days >= 60;
  }).length;

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div style={{ minHeight: '100vh', background: '#0d1f35', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              <svg width="24" height="24" viewBox="0 0 36 36" fill="none">
                <circle cx="18" cy="18" r="17" stroke="#c9a84c" strokeWidth="1.5"/>
                <line x1="18" y1="7" x2="18" y2="29" stroke="#c9a84c" strokeWidth="1.5"/>
                <line x1="11" y1="14" x2="25" y2="14" stroke="#c9a84c" strokeWidth="1.5"/>
                <path d="M11 29 Q18 24 25 29" stroke="#c9a84c" strokeWidth="1.5" fill="none"/>
              </svg>
              <span className="adm-logo-text">Harbour</span>
            </a>
            <span className="adm-admin-badge">Admin</span>
          </div>
          <div className="adm-nav-right">
            {lastSaved && <span className="adm-last-saved">{lastSaved}</span>}
            <a href="/dashboard" className="adm-nav-link">← Back to app</a>
          </div>
        </nav>

        <div className="adm-layout">

          {/* Sidebar */}
          <aside className="adm-sidebar">
            <div className="adm-sidebar-label">Config sections</div>
            {SECTIONS.map(s => {
              const sectionRows = s.keys.map(k => config[k]).filter(Boolean);
              const worstDue = sectionRows.reduce((worst, row) => {
                if (!row.next_due) return worst;
                const cls = dueBadgeClass(row.next_due);
                if (cls === 'adm-due-red') return 'red';
                if (cls === 'adm-due-amber' && worst !== 'red') return 'amber';
                return worst;
              }, 'green');

              return (
                <button
                  key={s.id}
                  className={`adm-sidebar-item${activeSection === s.id ? ' active' : ''}`}
                  onClick={() => scrollToSection(s.id)}
                >
                  <span>{s.title}</span>
                  <span className={`adm-sidebar-dot adm-dot-${worstDue}`} />
                </button>
              );
            })}
            <div className="adm-sidebar-label">History</div>
            <button
              className={`adm-sidebar-item${activeSection === 'log' ? ' active' : ''}`}
              onClick={() => scrollToSection('log')}
            >
              <span>Change log</span>
            </button>
          </aside>

          {/* Main */}
          <main className="adm-main">

            <div className="adm-page-header">
              <div className="adm-page-eyebrow">Admin</div>
              <h1 className="adm-page-title">Configuration</h1>
              <p className="adm-page-sub">All figures used in the forecast engine. Click any value to edit. Changes take effect on the next forecast run.</p>
            </div>

            {/* Status summary */}
            <div className="adm-status-row">
              <div className="adm-status-chip">
                <div className="adm-chip-dot" style={{ background: '#d4922a' }} />
                <span className="adm-chip-label">Due soon</span>
                <span className="adm-chip-val">{dueSoon} items</span>
              </div>
              <div className="adm-status-chip">
                <div className="adm-chip-dot" style={{ background: '#5b9e6e' }} />
                <span className="adm-chip-label">Up to date</span>
                <span className="adm-chip-val">{upToDate} items</span>
              </div>
            </div>

            {/* Config sections */}
            {SECTIONS.map(section => {
              const isOpen = openSections.has(section.id);
              const sectionRows = section.keys.map(k => config[k]).filter(Boolean);
              const worstDue = sectionRows.reduce((worst, row) => {
                if (!row.next_due) return worst;
                const cls = dueBadgeClass(row.next_due);
                if (cls === 'adm-due-red') return 'adm-due-red';
                if (cls === 'adm-due-amber' && worst !== 'adm-due-red') return 'adm-due-amber';
                return worst;
              }, 'adm-due-green');

              return (
                <div key={section.id} className="adm-config-section" id={`section-${section.id}`}>
                  <div className="adm-section-head" onClick={() => toggleSection(section.id)}>
                    <div className="adm-section-headm-left">
                      <div className="adm-section-icon">{section.icon}</div>
                      <div>
                        <div className="adm-section-title-text">{section.title}</div>
                        <div className="adm-section-sub-text">{section.sub}</div>
                      </div>
                    </div>
                    <div className="adm-section-headm-right">
                      <span className={`adm-due-badge ${worstDue}`}>{dueBadgeText(sectionRows[0]?.next_due)}</span>
                      <span className={`adm-chevron${isOpen ? ' open' : ''}`}>▾</span>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="adm-config-table">
                      <div className="adm-table-header">
                        <div style={{ padding: '8px 18px' }}>Field</div>
                        <div style={{ padding: '8px 12px' }}>Current value</div>
                        <div style={{ padding: '8px 14px', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.04)' }}>Last updated / Next due</div>
                      </div>

                      {section.keys.map(key => {
                        const row = config[key];
                        if (!row) return null;
                        const isEditingThis = editing === key;
                        const display = formatValue(key, row.value);

                        return (
                          <div key={key} className="adm-config-row">
                            <div className="adm-row-label">
                              <strong>{row.label}</strong>
                              <span className="adm-row-key">{key}</span>
                            </div>

                            <div className="adm-value-cell">
                              {!isEditingThis ? (
                                <div className="adm-value-display" onClick={() => startEdit(key)}>
                                  <span>{display}</span>
                                  <span className="adm-edit-icon">✎</span>
                                </div>
                              ) : (
                                <div>
                                  <input
                                    className="adm-value-input"
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
                                  <div className="adm-value-actions">
                                    <button className="adm-btn-save" onClick={() => saveEdit(key)} disabled={saving}>
                                      {saving ? '…' : 'Save'}
                                    </button>
                                    <button className="adm-btn-cancel" onClick={cancelEdit}>Cancel</button>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="adm-meta-cell">
                              <div className="adm-last-updated">{fmtDate(row.last_updated)}</div>
                              <div className={`adm-next-due ${dueBadgeClass(row.next_due)}`}>
                                {row.next_due ? dueBadgeText(row.next_due) : 'Stable'}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Pension total auto-calc */}
                      {section.id === 'pension' && (
                        <div className="adm-config-row" style={{ background: 'rgba(201,168,76,0.03)' }}>
                          <div className="adm-row-label">
                            <strong>Total maximum — Single</strong>
                            <span className="adm-row-key">Auto-calculated from above three values</span>
                          </div>
                          <div className="adm-value-cell">
                            <div className="adm-value-display" style={{ cursor: 'default', opacity: 0.7 }}>
                              <span>${parseFloat(pensionTotal).toLocaleString('en-AU', { minimumFractionDigits: 2 })} /fn</span>
                              <span style={{ fontSize: 10, color: '#8a9bb0' }}>calculated</span>
                            </div>
                          </div>
                          <div className="adm-meta-cell">
                            <div className="adm-last-updated">—</div>
                            <div className="adm-next-due adm-due-green">Auto</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Change log */}
            <div className="adm-change-log" id="section-log">
              <div className="adm-log-title">Recent changes</div>
              {log.length === 0 && (
                <div style={{ color: '#8a9bb0', fontSize: 13, fontWeight: 300, padding: '12px 0' }}>
                  No changes this session. Changes you make above will appear here.
                </div>
              )}
              {log.map(entry => (
                <div key={entry.id} className="adm-log-entry">
                  <div className="adm-log-dot" />
                  <div className="adm-log-text">
                    <strong>{entry.label}</strong> updated to {entry.display}
                  </div>
                  <div className="adm-log-time">{entry.dateStr}</div>
                </div>
              ))}
            </div>

          </main>
        </div>

        {/* Toast */}
        <div className={`adm-toast${toastVisible ? ' visible' : ''}`}>
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
    background: #0d1f35;
    color: #f5f0e8;
    min-height: 100vh;
    font-size: 14px;
    position: relative;
  }

  .adm-root::before {
    content: '';
    position: fixed; inset: 0;
    background-image:
      linear-gradient(rgba(201,168,76,0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(201,168,76,0.02) 1px, transparent 1px);
    background-size: 60px 60px;
    pointer-events: none; z-index: 0;
  }

  .adm-nav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 32px;
    border-bottom: 1px solid rgba(201,168,76,0.12);
    background: rgba(13,31,53,0.97);
    backdrop-filter: blur(10px);
    position: sticky; top: 0; z-index: 100;
  }

  .adm-nav-left { display: flex; align-items: center; gap: 16px; }
  .adm-logo { display: flex; align-items: center; gap: 8px; text-decoration: none; }
  .adm-logo-text {
    font-family: 'Playfair Display', serif;
    font-size: 18px; font-weight: 600;
    color: #f5f0e8; letter-spacing: 0.04em;
  }

  .adm-admin-badge {
    background: rgba(201,168,76,0.12);
    border: 1px solid rgba(201,168,76,0.25);
    color: #c9a84c; font-size: 10px; letter-spacing: 0.12em;
    text-transform: uppercase; padding: 3px 9px; border-radius: 20px;
    font-weight: 500;
  }

  .adm-nav-right { display: flex; align-items: center; gap: 16px; font-size: 13px; color: #8a9bb0; }
  .adm-nav-link { color: #8a9bb0; text-decoration: none; transition: color 0.2s; }
  .adm-nav-link:hover { color: #f5f0e8; }
  .adm-last-saved { font-size: 12px; color: rgba(138,155,176,0.6); }

  .adm-layout { display: flex; min-height: calc(100vh - 57px); position: relative; z-index: 1; }

  .adm-sidebar {
    width: 220px; flex-shrink: 0;
    border-right: 1px solid rgba(201,168,76,0.12);
    padding: 24px 0;
    position: sticky; top: 57px;
    height: calc(100vh - 57px);
    overflow-y: auto;
  }

  .adm-sidebar-label {
    font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase;
    color: #8a9bb0; font-weight: 500;
    padding: 0 20px; margin-bottom: 8px; margin-top: 20px;
  }
  .adm-sidebar-label:first-child { margin-top: 0; }

  .adm-sidebar-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 9px 20px; cursor: pointer;
    font-size: 13px; color: #8a9bb0;
    transition: all 0.15s; border: none; background: none;
    width: 100%; text-align: left; font-family: 'DM Sans', sans-serif;
    border-left: 2px solid transparent;
  }
  .adm-sidebar-item:hover { color: #f5f0e8; background: rgba(255,255,255,0.03); }
  .adm-sidebar-item.active { color: #f5f0e8; background: rgba(201,168,76,0.07); border-left-color: #c9a84c; }

  .adm-sidebar-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .adm-dot-green { background: #5b9e6e; }
  .adm-dot-amber { background: #d4922a; }
  .adm-dot-red   { background: #c0614a; }

  .adm-main { flex: 1; padding: 32px 36px; max-width: 820px; overflow-x: hidden; }

  .adm-page-header { margin-bottom: 28px; }
  .adm-page-eyebrow {
    font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
    color: #c9a84c; font-weight: 500; margin-bottom: 6px;
  }
  .adm-page-title {
    font-family: 'Playfair Display', serif;
    font-size: 26px; font-weight: 600; color: #f5f0e8;
    margin-bottom: 6px; line-height: 1.2;
  }
  .adm-page-sub { font-size: 13px; color: #8a9bb0; font-weight: 300; line-height: 1.5; }

  .adm-status-row { display: flex; gap: 12px; margin-bottom: 28px; flex-wrap: wrap; }
  .adm-status-chip {
    display: flex; align-items: center; gap: 7px;
    background: rgba(20,41,68,0.8);
    border: 1px solid rgba(201,168,76,0.12);
    border-radius: 4px; padding: 10px 14px; font-size: 12px;
  }
  .adm-chip-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .adm-chip-label { color: #8a9bb0; }
  .adm-chip-val { color: #f5f0e8; font-weight: 500; margin-left: 2px; }

  .adm-config-section { margin-bottom: 32px; }

  .adm-section-head {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 18px;
    background: rgba(20,41,68,0.6);
    border: 1px solid rgba(201,168,76,0.12);
    border-radius: 6px 6px 0 0;
    cursor: pointer; user-select: none;
  }

  .adm-section-headm-left { display: flex; align-items: center; gap: 10px; }

  .adm-section-icon {
    width: 30px; height: 30px;
    background: rgba(201,168,76,0.1);
    border: 1px solid rgba(201,168,76,0.2);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; flex-shrink: 0;
  }

  .adm-section-title-text { font-weight: 500; color: #f5f0e8; font-size: 14px; }
  .adm-section-sub-text { font-size: 11px; color: #8a9bb0; margin-top: 1px; }
  .adm-section-headm-right { display: flex; align-items: center; gap: 10px; }

  .adm-due-badge {
    font-size: 11px; padding: 3px 10px; border-radius: 20px;
    font-weight: 500; letter-spacing: 0.03em;
  }
  .adm-due-green { background: rgba(91,158,110,0.1);  color: #7ec896; border: 1px solid rgba(91,158,110,0.25); }
  .adm-due-amber { background: rgba(212,146,42,0.1);  color: #f0b860; border: 1px solid rgba(212,146,42,0.3); }
  .adm-due-red   { background: rgba(192,97,74,0.1);   color: #e08878; border: 1px solid rgba(192,97,74,0.3); }

  .adm-chevron { color: #8a9bb0; font-size: 12px; transition: transform 0.2s; }
  .adm-chevron.open { transform: rotate(180deg); }

  .adm-config-table {
    border: 1px solid rgba(201,168,76,0.12); border-top: none;
    border-radius: 0 0 6px 6px; overflow: hidden;
  }

  .adm-table-header {
    display: grid; grid-template-columns: 1fr 180px 130px;
    background: rgba(255,255,255,0.02);
    font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #8a9bb0;
  }

  .adm-config-row {
    display: grid; grid-template-columns: 1fr 180px 130px;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    align-items: center;
  }
  .adm-config-row:last-child { border-bottom: none; }

  .adm-row-label { padding: 14px 18px; font-size: 13px; color: #8a9bb0; font-weight: 300; line-height: 1.4; }
  .adm-row-label strong { color: #f5f0e8; font-weight: 500; display: block; margin-bottom: 2px; }
  .adm-row-key { font-size: 11px; color: rgba(138,155,176,0.5); }

  .adm-value-cell { padding: 10px 12px; }

  .adm-value-display {
    font-family: 'DM Sans', sans-serif;
    font-size: 14px; font-weight: 500; color: #f5f0e8;
    background: rgba(13,31,53,0.6);
    border: 1px solid rgba(201,168,76,0.15);
    border-radius: 4px; padding: 8px 12px;
    cursor: pointer; transition: all 0.2s;
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
  }
  .adm-value-display:hover { border-color: rgba(201,168,76,0.4); background: rgba(13,31,53,0.9); }

  .adm-edit-icon { color: #8a9bb0; font-size: 11px; flex-shrink: 0; opacity: 0; transition: opacity 0.2s; }
  .adm-value-display:hover .adm-edit-icon { opacity: 1; }

  .adm-value-input {
    font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500;
    color: #f5f0e8; background: #0d1f35;
    border: 1px solid #c9a84c; border-radius: 4px;
    padding: 8px 12px; outline: none; width: 100%;
    box-shadow: 0 0 0 3px rgba(201,168,76,0.12);
  }

  .adm-value-actions { display: flex; align-items: center; gap: 6px; margin-top: 6px; }

  .adm-btn-save {
    background: #c9a84c; border: none; color: #0d1f35;
    font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: 500;
    padding: 5px 12px; border-radius: 3px; cursor: pointer; transition: background 0.2s;
  }
  .adm-btn-save:hover:not(:disabled) { background: #e8cc88; }
  .adm-btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

  .adm-btn-cancel {
    background: transparent; border: 1px solid rgba(255,255,255,0.1);
    color: #8a9bb0; font-family: 'DM Sans', sans-serif;
    font-size: 12px; padding: 5px 10px; border-radius: 3px;
    cursor: pointer; transition: all 0.2s;
  }
  .adm-btn-cancel:hover { color: #f5f0e8; }

  .adm-meta-cell {
    padding: 10px 14px; font-size: 11px; color: #8a9bb0;
    text-align: center; line-height: 1.5;
    border-left: 1px solid rgba(255,255,255,0.04);
  }
  .adm-last-updated { margin-bottom: 3px; }
  .adm-next-due { font-weight: 500; }
  .adm-next-due.adm-due-amber { color: #f0b860; }
  .adm-next-due.adm-due-green { color: #7ec896; }
  .adm-next-due.adm-due-red   { color: #e08878; }

  .adm-change-log { margin-top: 40px; padding-top: 28px; border-top: 1px solid rgba(201,168,76,0.12); }

  .adm-log-title {
    font-family: 'Playfair Display', serif;
    font-size: 18px; font-weight: 600; color: #f5f0e8; margin-bottom: 20px;
  }

  .adm-log-entry {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.04); font-size: 13px;
  }
  .adm-log-entry:last-child { border-bottom: none; }

  .adm-log-dot { width: 8px; height: 8px; border-radius: 50%; background: #c9a84c; flex-shrink: 0; margin-top: 4px; }
  .adm-log-text { flex: 1; color: #8a9bb0; font-weight: 300; line-height: 1.5; }
  .adm-log-text strong { color: #f5f0e8; font-weight: 500; }
  .adm-log-time { font-size: 11px; color: #8a9bb0; white-space: nowrap; margin-top: 2px; }

  .adm-toast {
    position: fixed; bottom: 24px; right: 24px; z-index: 999;
    background: #142944; border: 1px solid rgba(91,158,110,0.4);
    color: #7ec896; font-size: 13px; padding: 10px 18px; border-radius: 4px;
    opacity: 0; transform: translateY(8px); transition: all 0.25s; pointer-events: none;
  }
  .adm-toast.visible { opacity: 1; transform: translateY(0); }

  .adm-spinner {
    width: 36px; height: 36px;
    border: 2px solid rgba(201,168,76,0.2);
    border-top-color: #c9a84c;
    border-radius: 50%;
    animation: adm-spin 0.7s linear infinite;
  }
  @keyframes adm-spin { to { transform: rotate(360deg); } }

  @media (max-width: 768px) {
    .adm-sidebar { display: none; }
    .adm-main { padding: 24px 16px; }
    .adm-table-header, .adm-config-row { grid-template-columns: 1fr 140px; }
    .adm-meta-cell { display: none; }
  }
`;
