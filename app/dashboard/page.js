'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (val) => {
  if (val === null || val === undefined) return '—';
  if (val >= 1_000_000) return '$' + (val / 1_000_000).toFixed(1) + 'm';
  if (val >= 1_000) return '$' + Math.round(val / 1_000) + 'k';
  return '$' + Math.round(val).toLocaleString('en-AU');
};

const fmtAge = (age) => {
  if (!age || age >= 90) return 'Age 90+';
  return 'Age ' + age;
};

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

const fmtDateLong = (iso) =>
  new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

// ── Component ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser]           = useState(null);
  const [forecasts, setForecasts] = useState([]);
  const [latestConfig, setLatestConfig] = useState(null);
  const [isPlus, setIsPlus]       = useState(false);
  const [loading, setLoading]     = useState(true);
  const [deleting, setDeleting]   = useState(null); // forecast id being deleted

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      // Auth check
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/auth/login'); return; }
      setUser(session.user);

      // Load forecasts
      const { data: rows } = await supabase
        .from('forecasts')
        .select('*')
        .order('created_at', { ascending: false });

      setForecasts(rows || []);

      // Load latest config update date (for stale detection)
      const { data: configRows } = await supabase
        .from('config')
        .select('last_updated')
        .order('last_updated', { ascending: false })
        .limit(1);

      if (configRows && configRows.length > 0) {
        setLatestConfig(configRows[0].last_updated);
      }

      // Load or create profile (for Plus tier status)
      let { data: profile } = await supabase
        .from('profiles')
        .select('is_plus')
        .eq('id', session.user.id)
        .single();

      if (!profile) {
        const { data: created } = await supabase
          .from('profiles')
          .insert({ id: session.user.id, is_plus: false })
          .select('is_plus')
          .single();
        profile = created;
      }

      setIsPlus(profile?.is_plus === true);
      setLoading(false);
    }
    load();
  }, [router]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Delete this forecast? This cannot be undone.')) return;
    setDeleting(id);
    const supabase = createClient();
    await supabase.from('forecasts').delete().eq('id', id);
    setForecasts(f => f.filter(x => x.id !== id));
    setDeleting(null);
  };

  // Is a forecast stale? (generated before latest config update)
  const isStale = (forecast) => {
    if (!latestConfig) return false;
    return new Date(forecast.created_at) < new Date(latestConfig);
  };

  // Any stale forecasts?
  const hasStale = forecasts.some(isStale);

  // User display name — prefer profile name, fall back to email prefix
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'there';
  const userInitial = displayName[0].toUpperCase();

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div style={{ minHeight: '100vh', background: '#0d1f35', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="hd-spinner" />
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        ${styles}
      `}</style>

      <div className="hd-root">

        {/* ── Nav ─────────────────────────────────────────────── */}
        <nav className="hd-nav">
          <a href="/" className="hd-logo">
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="17" stroke="#c9a84c" strokeWidth="1"/>
              <line x1="18" y1="7" x2="18" y2="29" stroke="#c9a84c" strokeWidth="1.5"/>
              <line x1="11" y1="14" x2="25" y2="14" stroke="#c9a84c" strokeWidth="1.5"/>
              <path d="M11 29 Q18 24 25 29" stroke="#c9a84c" strokeWidth="1.5" fill="none"/>
            </svg>
            <span className="hd-logo-text">Harbour</span>
          </a>
          <div className="hd-nav-right">
            <a href="/profile" className="hd-user-chip" style={{ textDecoration: 'none' }}>
  <div className="hd-user-avatar">{userInitial}</div>
  <span>{user?.email}</span>
</a>
            <button className="hd-btn-ghost" onClick={handleSignOut}>Sign out</button>
          </div>
        </nav>

        {/* ── Page ────────────────────────────────────────────── */}
        <div className="hd-page">

          {/* Header */}
          <div className="hd-header">
            <div className="hd-greeting">My Account</div>
            <h1 className="hd-title">{greeting}, <em>{displayName}</em></h1>
            <div className="hd-sub">Manage your saved forecasts and account settings.</div>
          </div>

          {/* Rate change notice — only shown if stale forecasts exist */}
          {hasStale && latestConfig && (
            <div className="hd-rate-notice">
              <div className="hd-rate-notice-text">
                <strong>Centrelink rates updated {fmtDateLong(latestConfig)}.</strong>{' '}
                One or more of your saved forecasts were generated before this change — re-run them to see updated Age Pension figures.
              </div>
              <button className="hd-rate-notice-btn" onClick={() => router.push('/forecast/new')}>
                Re-run forecast ›
              </button>
            </div>
          )}

          {/* Upgrade banner — shown to free users only */}
          {!isPlus && (
            <div className="hd-upgrade-banner">
              <div className="hd-upgrade-left">
                <div className="hd-upgrade-icon">✦</div>
                <div>
                  <div className="hd-upgrade-label">Free plan</div>
                  <div className="hd-upgrade-headline">Add your partner and see the full picture</div>
                  <div className="hd-upgrade-desc">Harbour Plus includes unlimited forecasts, partner details, combined Age Pension calculations, and PDF export.</div>
                </div>
              </div>
              <button className="hd-btn-gold" onClick={() => router.push('/upgrade')}>
                See Plus →
              </button>
            </div>
          )}

          {/* Forecasts section */}
          <div className="hd-section-header">
            <div className="hd-section-title">Saved forecasts</div>
            <span className="hd-section-count">
              {isPlus ? `${forecasts.length} saved` : `${forecasts.length} of 3 saved`}
            </span>
          </div>

          <div className="hd-forecast-grid">
            {forecasts.length === 0 ? (
              <div className="hd-empty">
                <div className="hd-empty-icon">⚓</div>
                <div className="hd-empty-title">No forecasts yet</div>
                <div className="hd-empty-desc">Run your first forecast to see your retirement projection.</div>
                <button className="hd-btn-gold" onClick={() => router.push('/forecast/new')}>
                  + Run a forecast
                </button>
              </div>
            ) : (
              forecasts.map(fc => {
                const stale = isStale(fc);
                const outputs = fc.outputs || {};
                const inputs  = fc.inputs  || {};
                const pensionFn = outputs.pension_annual
                  ? Math.round(outputs.pension_annual / 26)
                  : null;

                return (
                  <a
                    key={fc.id}
                    className="hd-forecast-card"
                    href={`/forecast/${fc.id}`}
                  >
                    <div className="hd-card-inner">
                      <div className={`hd-card-accent${stale ? ' stale' : ''}`} />
                      <div className="hd-card-main">
                        <div className="hd-card-left">
                          <div className="hd-card-name">{fc.name}</div>
                          <div className="hd-card-meta">
                            <span>Age {inputs.current_age}</span>
                            <span className="hd-meta-sep">·</span>
                            <span>Super {fmt(inputs.super_balance)}</span>
                            <span className="hd-meta-sep">·</span>
                            <span>Retiring age {inputs.retirement_age}</span>
                            <span className="hd-meta-sep">·</span>
                            <span>Saved {fmtDate(fc.created_at)}</span>
                            {stale && (
                              <span className="hd-stale-badge">Rates updated — re-run</span>
                            )}
                          </div>
                        </div>
                        <div className="hd-card-stats">
                          <div className="hd-card-stat">
                            <div className="hd-card-stat-label">Super at retirement</div>
                            <div className="hd-card-stat-value gold">
                              {fmt(outputs.retirement_balance_median)}
                            </div>
                          </div>
                          <div className="hd-card-stat">
                            <div className="hd-card-stat-label">Age Pension</div>
                            <div className="hd-card-stat-value green">
                              {pensionFn ? fmt(pensionFn) + ' /fn' : '—'}
                            </div>
                          </div>
                          <div className="hd-card-stat">
                            <div className="hd-card-stat-label">Funds last</div>
                            <div className="hd-card-stat-value blue">
                              {fmtAge(outputs.funds_last_p50)}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="hd-card-actions">
                        <button
                          className="hd-card-action-btn"
                          title="Edit and re-run this forecast"
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            sessionStorage.setItem('harbour_rerun', JSON.stringify({ ...fc.inputs, name: fc.name, _forecast_id: fc.id }));
                            router.push('/forecast/new');
                          }}
                        >
                          ↺
                        </button>
                        <button
                          className="hd-card-action-btn"
                          title="Delete forecast"
                          onClick={e => handleDelete(e, fc.id)}
                          disabled={deleting === fc.id}
                        >
                          {deleting === fc.id ? '…' : '✕'}
                        </button>
                      </div>
                    </div>
                  </a>
                );
              })
            )}
          </div>

          {/* New forecast CTA */}
          <button className="hd-btn-gold hd-new-btn" onClick={() => router.push('/forecast/new')}>
            + Run a new forecast
          </button>

          <div className="hd-divider" />

          {/* Account details */}
          <div className="hd-section-header" style={{ marginBottom: 14 }}>
            <div className="hd-section-title">Account</div>
          </div>

          <div className="hd-account-section">
            <div className="hd-account-section-title">Account details</div>
            <div className="hd-account-row">
              <span className="hd-account-label">Email</span>
              <span className="hd-account-value">{user?.email}</span>
            </div>
            <div className="hd-account-row">
              <span className="hd-account-label">Member since</span>
              <span className="hd-account-value">
                {user?.created_at ? fmtDateLong(user.created_at) : '—'}
              </span>
            </div>
            <div className="hd-account-row">
              <span className="hd-account-label">Profile settings</span>
              <a href="/profile" className="hd-account-action">Edit profile →</a>
            </div>
          </div>

          <div className="hd-account-section">
            <div className="hd-account-section-title">Plan</div>
            <div className="hd-account-row">
              <span className="hd-account-label">Current plan</span>
              {isPlus
                ? <span className="hd-plan-badge plus">✦ Harbour Plus</span>
                : <span className="hd-plan-badge">✦ Free</span>
              }
            </div>
            <div className="hd-account-row">
              <span className="hd-account-label">Forecasts saved</span>
              <span className="hd-account-value">
                {isPlus ? `${forecasts.length} (unlimited)` : `${forecasts.length} of 3`}
              </span>
            </div>
            <div className="hd-account-row">
              <span className="hd-account-label">Partner details</span>
              {isPlus
                ? <span className="hd-account-value" style={{ color: '#7ec896' }}>Included</span>
                : <a href="/upgrade" className="hd-account-action">Upgrade to Plus →</a>
              }
            </div>
            <div className="hd-account-row">
              <span className="hd-account-label">PDF export</span>
              {isPlus
                ? <span className="hd-account-value" style={{ color: '#7ec896' }}>Included</span>
                : <a href="/upgrade" className="hd-account-action">Upgrade to Plus →</a>
              }
            </div>
          </div>

          <div className="hd-account-section">
            <div className="hd-account-section-title">Data &amp; privacy</div>
            <div className="hd-account-row">
              <span className="hd-account-label">Delete account</span>
              <button
  className="hd-account-action"
  style={{ color: '#e08878' }}
  onClick={async () => {
    if (!confirm('Are you sure? This will permanently delete your account and all saved forecasts. This cannot be undone.')) return;
    const res = await fetch('/api/account/delete', { method: 'DELETE' });
    if (res.ok) {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/?deleted=true');
    } else {
      alert('Something went wrong. Please try again or contact hello@harbourapp.com.au.');
    }
  }}
>
  Delete all data
</button>
            </div>
          </div>

          <div className="hd-footer">
            Harbour provides general information only, not financial advice.<br />
            Forecasts are projections and not guaranteed outcomes.<br />
            Always verify your entitlements with Services Australia or a licensed financial adviser.
          </div>

        </div>
      </div>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = `
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  .hd-root {
    font-family: 'DM Sans', sans-serif;
    background: #0d1f35;
    color: #f5f0e8;
    min-height: 100vh;
  }

  .hd-root::before {
    content: '';
    position: fixed; inset: 0;
    background-image:
      linear-gradient(rgba(201,168,76,0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(201,168,76,0.02) 1px, transparent 1px);
    background-size: 60px 60px;
    pointer-events: none; z-index: 0;
  }

  /* Nav */
  .hd-nav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 40px;
    border-bottom: 1px solid rgba(201,168,76,0.1);
    position: sticky; top: 0; z-index: 100;
    background: rgba(13,31,53,0.97);
    backdrop-filter: blur(10px);
  }

  .hd-logo {
    display: flex; align-items: center; gap: 10px;
    text-decoration: none;
  }

  .hd-logo-text {
    font-family: 'Playfair Display', serif;
    font-size: 20px; font-weight: 600;
    color: #f5f0e8; letter-spacing: 0.04em;
  }

  .hd-nav-right { display: flex; align-items: center; gap: 20px; }

  .hd-user-chip {
    display: flex; align-items: center; gap: 8px;
    font-size: 13px; color: #8a9bb0;
  }

  .hd-user-avatar {
    width: 30px; height: 30px; border-radius: 50%;
    background: rgba(201,168,76,0.15);
    border: 1px solid rgba(201,168,76,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 500; color: #c9a84c;
    flex-shrink: 0;
  }

  .hd-btn-ghost {
    background: transparent; border: none;
    color: #8a9bb0; font-family: 'DM Sans', sans-serif;
    font-size: 13px; cursor: pointer; padding: 4px 0;
    transition: color 0.2s;
  }
  .hd-btn-ghost:hover { color: #f5f0e8; }

  .hd-btn-gold {
    background: #c9a84c; border: none; color: #0d1f35;
    font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
    padding: 9px 20px; border-radius: 3px; cursor: pointer;
    letter-spacing: 0.03em; transition: all 0.2s; text-decoration: none;
    display: inline-block;
  }
  .hd-btn-gold:hover { background: #e8cc88; }

  /* Page */
  .hd-page {
    max-width: 900px; margin: 0 auto;
    padding: 40px 24px 80px;
    position: relative; z-index: 1;
  }

  /* Header */
  .hd-header { margin-bottom: 36px; }

  .hd-greeting {
    font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase;
    color: #8a9bb0; font-weight: 500; margin-bottom: 8px;
  }

  .hd-title {
    font-family: 'Playfair Display', serif;
    font-size: 32px; font-weight: 700; color: #f5f0e8;
    line-height: 1.2; margin-bottom: 6px;
  }

  .hd-title em { color: #e8cc88; font-style: italic; }
  .hd-sub { font-size: 14px; color: #8a9bb0; font-weight: 300; }

  /* Rate notice */
  .hd-rate-notice {
    background: rgba(192,97,74,0.08);
    border: 1px solid rgba(192,97,74,0.2);
    border-left: 3px solid #e08878;
    border-radius: 0 6px 6px 0;
    padding: 14px 18px; margin-bottom: 20px;
    display: flex; justify-content: space-between;
    align-items: center; gap: 12px; flex-wrap: wrap;
    font-size: 13px;
  }

  .hd-rate-notice-text { color: #8a9bb0; line-height: 1.5; }
  .hd-rate-notice-text strong { color: #f5f0e8; }

  .hd-rate-notice-btn {
    background: transparent;
    border: 1px solid rgba(224,136,120,0.4);
    color: #e08878; font-family: 'DM Sans', sans-serif;
    font-size: 12px; padding: 7px 14px; border-radius: 3px;
    cursor: pointer; white-space: nowrap; flex-shrink: 0;
    transition: all 0.2s;
  }
  .hd-rate-notice-btn:hover { background: rgba(192,97,74,0.1); }

  /* Upgrade banner */
  .hd-upgrade-banner {
    background: linear-gradient(135deg, rgba(30,58,95,0.9) 0%, rgba(20,41,68,0.95) 100%);
    border: 1px solid rgba(201,168,76,0.25);
    border-radius: 8px; padding: 24px 28px;
    display: flex; align-items: center; justify-content: space-between;
    gap: 20px; margin-bottom: 32px; flex-wrap: wrap;
    position: relative; overflow: hidden;
  }

  .hd-upgrade-banner::before {
    content: ''; position: absolute;
    top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, #c9a84c 0%, rgba(201,168,76,0.1) 100%);
  }

  .hd-upgrade-left { display: flex; align-items: center; gap: 16px; }

  .hd-upgrade-icon {
    width: 44px; height: 44px;
    background: rgba(201,168,76,0.1);
    border: 1px solid rgba(201,168,76,0.25);
    border-radius: 50%; display: flex;
    align-items: center; justify-content: center;
    font-size: 20px; flex-shrink: 0;
  }

  .hd-upgrade-label {
    font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
    color: #c9a84c; margin-bottom: 4px; font-weight: 500;
  }

  .hd-upgrade-headline {
    font-family: 'Playfair Display', serif;
    font-size: 17px; font-weight: 600; color: #f5f0e8;
    margin-bottom: 4px; line-height: 1.2;
  }

  .hd-upgrade-desc { font-size: 13px; color: #8a9bb0; font-weight: 300; }

  /* Section header */
  .hd-section-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 16px;
  }

  .hd-section-title {
    font-family: 'Playfair Display', serif;
    font-size: 20px; font-weight: 600; color: #f5f0e8;
  }

  .hd-section-count {
    font-size: 12px; color: #8a9bb0;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    padding: 4px 10px; border-radius: 20px;
  }

  /* Forecast cards */
  .hd-forecast-grid { display: flex; flex-direction: column; gap: 14px; margin-bottom: 28px; }

  .hd-forecast-card {
    background: rgba(20,41,68,0.7);
    border: 1px solid rgba(201,168,76,0.12);
    border-radius: 8px; overflow: hidden;
    transition: border-color 0.2s;
    cursor: pointer; text-decoration: none; display: block;
  }

  .hd-forecast-card:hover { border-color: rgba(201,168,76,0.35); }

  .hd-card-inner { display: flex; align-items: center; }

  .hd-card-accent {
    width: 4px; align-self: stretch;
    background: #c9a84c; flex-shrink: 0;
  }

  .hd-card-accent.stale { background: #e08878; }

  .hd-card-main {
    flex: 1; padding: 20px 22px;
    display: flex; align-items: center;
    justify-content: space-between; gap: 16px;
    flex-wrap: wrap;
  }

  .hd-card-left { min-width: 0; }

  .hd-card-name {
    font-family: 'Playfair Display', serif;
    font-size: 17px; font-weight: 600; color: #f5f0e8;
    margin-bottom: 4px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  .hd-card-meta {
    font-size: 12px; color: #8a9bb0;
    display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
  }

  .hd-meta-sep { color: rgba(138,155,176,0.3); }

  .hd-stale-badge {
    background: rgba(192,97,74,0.15);
    border: 1px solid rgba(192,97,74,0.3);
    color: #e08878; font-size: 10px;
    padding: 2px 8px; border-radius: 20px;
    letter-spacing: 0.05em; font-weight: 500;
  }

  .hd-card-stats { display: flex; gap: 24px; flex-shrink: 0; }

  .hd-card-stat { text-align: right; }

  .hd-card-stat-label {
    font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
    color: #8a9bb0; margin-bottom: 3px;
  }

  .hd-card-stat-value {
    font-family: 'Playfair Display', serif;
    font-size: 16px; font-weight: 600;
  }

  .hd-card-stat-value.gold  { color: #c9a84c; }
  .hd-card-stat-value.green { color: #7ec896; }
  .hd-card-stat-value.blue  { color: #7ab8f0; }

  .hd-card-actions {
    padding: 0 16px 0 0;
    display: flex; align-items: center; gap: 8px;
  }

  .hd-card-action-btn {
    width: 32px; height: 32px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 50%; display: flex;
    align-items: center; justify-content: center;
    cursor: pointer; color: #8a9bb0;
    font-size: 14px; transition: all 0.2s;
  }

  .hd-card-action-btn:hover { background: rgba(255,255,255,0.1); color: #f5f0e8; }
  .hd-card-action-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  /* Empty state */
  .hd-empty {
    text-align: center; padding: 60px 20px;
    background: rgba(20,41,68,0.4);
    border: 1px dashed rgba(201,168,76,0.15);
    border-radius: 8px;
  }

  .hd-empty-icon { font-size: 40px; margin-bottom: 16px; opacity: 0.5; }

  .hd-empty-title {
    font-family: 'Playfair Display', serif;
    font-size: 20px; color: #f5f0e8; margin-bottom: 8px;
  }

  .hd-empty-desc {
    font-size: 14px; color: #8a9bb0;
    font-weight: 300; margin-bottom: 24px;
  }

  /* New forecast button */
  .hd-new-btn {
    margin-bottom: 40px;
    display: inline-flex; align-items: center; gap: 8px;
  }

  /* Divider */
  .hd-divider { height: 1px; background: rgba(255,255,255,0.05); margin: 28px 0; }

  /* Account section */
  .hd-account-section {
    background: rgba(20,41,68,0.5);
    border: 1px solid rgba(201,168,76,0.1);
    border-radius: 8px; overflow: hidden;
    margin-bottom: 32px;
  }

  .hd-account-section-title {
    font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase;
    color: #8a9bb0; font-weight: 500;
    padding: 16px 24px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }

  .hd-account-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 16px 24px;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    font-size: 14px;
  }

  .hd-account-row:last-child { border-bottom: none; }

  .hd-account-label { color: #8a9bb0; font-weight: 300; }
  .hd-account-value { color: #f5f0e8; font-weight: 500; }

  .hd-account-action {
    color: #c9a84c; font-size: 13px;
    cursor: pointer; background: none; border: none;
    font-family: 'DM Sans', sans-serif;
    transition: color 0.2s; padding: 0; text-decoration: none;
  }
  .hd-account-action:hover { color: #e8cc88; }

  .hd-plan-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(201,168,76,0.1);
    border: 1px solid rgba(201,168,76,0.25);
    color: #c9a84c; font-size: 12px;
    padding: 4px 10px; border-radius: 20px;
    font-weight: 500;
  }

  .hd-plan-badge.plus {
    background: rgba(201,168,76,0.18);
    border-color: rgba(201,168,76,0.5);
    color: #e8cc88;
  }

  /* Footer */
  .hd-footer {
    text-align: center; margin-top: 32px;
    font-size: 11px; color: rgba(138,155,176,0.4);
    line-height: 1.6;
  }

  /* Spinner */
  .hd-spinner {
    width: 36px; height: 36px;
    border: 2px solid rgba(201,168,76,0.2);
    border-top-color: #c9a84c;
    border-radius: 50%;
    animation: hd-spin 0.7s linear infinite;
  }

  @keyframes hd-spin { to { transform: rotate(360deg); } }

  /* Responsive */
  @media (max-width: 680px) {
    .hd-nav { padding: 16px 20px; }
    .hd-user-chip span { display: none; }
    .hd-page { padding: 24px 16px 60px; }
    .hd-title { font-size: 24px; }
    .hd-card-main { flex-direction: column; align-items: flex-start; gap: 8px; padding: 14px 16px; }
    .hd-card-stats { gap: 14px; }
    .hd-card-stat { text-align: left; }
    .hd-card-stat-value { font-size: 14px; }
    .hd-card-stat-label { font-size: 9px; }
    .hd-card-actions { padding-right: 12px; align-self: flex-start; padding-top: 14px; }
    .hd-card-action-btn { width: 40px; height: 40px; }
    .hd-upgrade-banner { flex-direction: column; align-items: flex-start; }
    .hd-account-row { flex-wrap: wrap; gap: 4px 8px; }
  }
`;
