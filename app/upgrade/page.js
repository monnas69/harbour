'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function UpgradePage() {
  const router = useRouter();
  const [isPlus, setIsPlus] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/auth/login'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_plus')
        .eq('id', session.user.id)
        .single();

      setIsPlus(profile?.is_plus === true);
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div style={{ minHeight: '100vh', background: '#0d1f35', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="up-spinner" />
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

      <div className="up-root">

        {/* Nav */}
        <nav className="up-nav">
          <a href="/" className="up-logo">
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="17" stroke="#c9a84c" strokeWidth="1"/>
              <line x1="18" y1="7" x2="18" y2="29" stroke="#c9a84c" strokeWidth="1.5"/>
              <line x1="11" y1="14" x2="25" y2="14" stroke="#c9a84c" strokeWidth="1.5"/>
              <path d="M11 29 Q18 24 25 29" stroke="#c9a84c" strokeWidth="1.5" fill="none"/>
            </svg>
            <span className="up-logo-text">Harbour</span>
          </a>
          <a href="/dashboard" className="up-back">← Back to dashboard</a>
        </nav>

        <div className="up-page">

          {/* Header */}
          <div className="up-header">
            <div className="up-eyebrow">Plans &amp; Pricing</div>
            <h1 className="up-title">The full picture,<br /><em>for your future</em></h1>
            <p className="up-sub">
              Harbour Plus gives you unlimited forecasts, partner planning, and PDF export — everything you need to plan retirement with confidence.
            </p>
          </div>

          {/* Already Plus */}
          {isPlus && (
            <div className="up-plus-notice">
              <span className="up-plus-badge">✦ Harbour Plus</span>
              <span>You're already on Plus — enjoy all the features below.</span>
            </div>
          )}

          {/* Pricing cards */}
          <div className="up-cards">

            {/* Free */}
            <div className="up-card">
              <div className="up-card-header">
                <div className="up-card-plan">Free</div>
                <div className="up-card-price">$0</div>
                <div className="up-card-period">forever</div>
              </div>
              <ul className="up-features">
                <li className="up-feature included">
                  <span className="up-check">✓</span>
                  Monte Carlo retirement projections
                </li>
                <li className="up-feature included">
                  <span className="up-check">✓</span>
                  Australian Age Pension calculations
                </li>
                <li className="up-feature included">
                  <span className="up-check">✓</span>
                  Superannuation drawdown modelling
                </li>
                <li className="up-feature included">
                  <span className="up-check">✓</span>
                  Up to 3 saved forecasts
                </li>
                <li className="up-feature excluded">
                  <span className="up-cross">✕</span>
                  Unlimited saved forecasts
                </li>
                <li className="up-feature excluded">
                  <span className="up-cross">✕</span>
                  Partner &amp; couples forecasting
                </li>
                <li className="up-feature excluded">
                  <span className="up-cross">✕</span>
                  Combined Age Pension calculations
                </li>
                <li className="up-feature excluded">
                  <span className="up-cross">✕</span>
                  PDF export
                </li>
              </ul>
              <button className="up-btn-current" disabled>Current plan</button>
            </div>

            {/* Plus */}
            <div className="up-card plus">
              <div className="up-card-popular">Most popular</div>
              <div className="up-card-header">
                <div className="up-card-plan">
                  <span className="up-plus-star">✦</span> Plus
                </div>
                <div className="up-card-price">$55</div>
                <div className="up-card-period">per year</div>
              </div>
              <ul className="up-features">
                <li className="up-feature included">
                  <span className="up-check">✓</span>
                  Monte Carlo retirement projections
                </li>
                <li className="up-feature included">
                  <span className="up-check">✓</span>
                  Australian Age Pension calculations
                </li>
                <li className="up-feature included">
                  <span className="up-check">✓</span>
                  Superannuation drawdown modelling
                </li>
                <li className="up-feature included">
                  <span className="up-check">✓</span>
                  Unlimited saved forecasts
                </li>
                <li className="up-feature included">
                  <span className="up-check">✓</span>
                  Partner &amp; couples forecasting
                </li>
                <li className="up-feature included">
                  <span className="up-check">✓</span>
                  Combined Age Pension calculations
                </li>
                <li className="up-feature included">
                  <span className="up-check">✓</span>
                  PDF export
                </li>
              </ul>
              {isPlus ? (
                <button className="up-btn-plus active" disabled>✦ Active — Harbour Plus</button>
              ) : (
                <button className="up-btn-plus coming-soon" disabled title="Online payments coming soon">
                  Coming soon
                </button>
              )}
              {!isPlus && (
                <p className="up-coming-hint">
                  Online payments are coming soon. In the meantime, email us at{' '}
                  <a href="mailto:hello@harbourapp.com.au" className="up-email-link">hello@harbourapp.com.au</a>{' '}
                  to get Plus access early.
                </p>
              )}
            </div>

          </div>

          {/* FAQ */}
          <div className="up-faq">
            <h2 className="up-faq-title">Common questions</h2>

            <div className="up-faq-item">
              <div className="up-faq-q">What is partner forecasting?</div>
              <div className="up-faq-a">
                Partner forecasting lets you add your spouse or partner's details — their age, super balance, and salary — and Harbour will model your retirement as a couple. This includes combined Age Pension eligibility, which is calculated differently for couples than for singles.
              </div>
            </div>

            <div className="up-faq-item">
              <div className="up-faq-q">Can I cancel my Plus subscription?</div>
              <div className="up-faq-a">
                Yes. You can cancel at any time from your account settings. Your Plus access will continue until the end of your billing period.
              </div>
            </div>

            <div className="up-faq-item">
              <div className="up-faq-q">Will my saved forecasts be lost if I downgrade?</div>
              <div className="up-faq-a">
                No. Your forecasts are always yours. If you downgrade from Plus to Free, you'll keep all your existing saved forecasts — you just won't be able to save new ones beyond the 3-forecast free limit.
              </div>
            </div>

            <div className="up-faq-item">
              <div className="up-faq-q">Is my data secure?</div>
              <div className="up-faq-a">
                Yes. All forecast data is stored securely in your account and is only accessible to you. Harbour does not share or sell your personal data.
              </div>
            </div>
          </div>

          <div className="up-footer">
            Harbour provides general information only, not financial advice.<br />
            Forecasts are projections and not guaranteed outcomes.<br />
            Always verify your entitlements with Services Australia or a licensed financial adviser.
          </div>

        </div>
      </div>
    </>
  );
}

const styles = `
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  .up-root {
    font-family: 'DM Sans', sans-serif;
    background: #0d1f35;
    color: #f5f0e8;
    min-height: 100vh;
  }

  .up-root::before {
    content: '';
    position: fixed; inset: 0;
    background-image:
      linear-gradient(rgba(201,168,76,0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(201,168,76,0.02) 1px, transparent 1px);
    background-size: 60px 60px;
    pointer-events: none; z-index: 0;
  }

  /* Nav */
  .up-nav {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 40px;
    border-bottom: 1px solid rgba(201,168,76,0.1);
    position: sticky; top: 0; z-index: 100;
    background: rgba(13,31,53,0.97);
    backdrop-filter: blur(10px);
  }

  .up-logo {
    display: flex; align-items: center; gap: 10px;
    text-decoration: none;
  }

  .up-logo-text {
    font-family: 'Playfair Display', serif;
    font-size: 20px; font-weight: 600;
    color: #f5f0e8; letter-spacing: 0.04em;
  }

  .up-back {
    color: #8a9bb0; font-size: 13px;
    text-decoration: none; transition: color 0.2s;
  }
  .up-back:hover { color: #f5f0e8; }

  /* Page */
  .up-page {
    max-width: 900px; margin: 0 auto;
    padding: 60px 24px 80px;
    position: relative; z-index: 1;
  }

  /* Header */
  .up-header { text-align: center; margin-bottom: 48px; }

  .up-eyebrow {
    font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase;
    color: #c9a84c; font-weight: 500; margin-bottom: 16px;
  }

  .up-title {
    font-family: 'Playfair Display', serif;
    font-size: 40px; font-weight: 700; color: #f5f0e8;
    line-height: 1.15; margin-bottom: 16px;
  }
  .up-title em { color: #e8cc88; font-style: italic; }

  .up-sub {
    font-size: 16px; color: #8a9bb0; font-weight: 300;
    max-width: 540px; margin: 0 auto; line-height: 1.6;
  }

  /* Plus notice */
  .up-plus-notice {
    display: flex; align-items: center; gap: 12px;
    background: rgba(201,168,76,0.08);
    border: 1px solid rgba(201,168,76,0.25);
    border-radius: 8px; padding: 16px 20px;
    margin-bottom: 32px; font-size: 14px; color: #8a9bb0;
  }

  .up-plus-badge {
    background: rgba(201,168,76,0.15);
    border: 1px solid rgba(201,168,76,0.3);
    color: #c9a84c; font-size: 12px;
    padding: 4px 12px; border-radius: 20px;
    font-weight: 500; white-space: nowrap;
  }

  /* Cards */
  .up-cards {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 24px; margin-bottom: 64px;
  }

  .up-card {
    background: rgba(20,41,68,0.7);
    border: 1px solid rgba(201,168,76,0.12);
    border-radius: 12px; padding: 32px;
    position: relative;
  }

  .up-card.plus {
    border-color: rgba(201,168,76,0.35);
    background: rgba(20,41,68,0.9);
  }

  .up-card.plus::before {
    content: ''; position: absolute;
    top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, #c9a84c, rgba(201,168,76,0.2));
    border-radius: 12px 12px 0 0;
  }

  .up-card-popular {
    position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
    background: #c9a84c; color: #0d1f35;
    font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; padding: 4px 14px; border-radius: 20px;
    white-space: nowrap;
  }

  .up-card-header { margin-bottom: 28px; }

  .up-card-plan {
    font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase;
    color: #8a9bb0; font-weight: 500; margin-bottom: 10px;
    display: flex; align-items: center; gap: 6px;
  }

  .plus .up-card-plan { color: #c9a84c; }

  .up-plus-star { color: #c9a84c; }

  .up-card-price {
    font-family: 'Playfair Display', serif;
    font-size: 48px; font-weight: 700; color: #f5f0e8;
    line-height: 1; margin-bottom: 4px;
  }

  .plus .up-card-price { color: #e8cc88; }

  .up-card-period { font-size: 13px; color: #8a9bb0; font-weight: 300; }

  /* Features */
  .up-features {
    list-style: none; margin-bottom: 28px;
    display: flex; flex-direction: column; gap: 12px;
  }

  .up-feature {
    display: flex; align-items: center; gap: 10px;
    font-size: 14px; font-weight: 300;
  }

  .up-feature.included { color: #f5f0e8; }
  .up-feature.excluded { color: rgba(138,155,176,0.5); }

  .up-check {
    width: 18px; height: 18px; border-radius: 50%;
    background: rgba(126,200,150,0.15);
    border: 1px solid rgba(126,200,150,0.3);
    color: #7ec896; font-size: 10px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .up-cross {
    width: 18px; height: 18px; border-radius: 50%;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    color: rgba(138,155,176,0.4); font-size: 10px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  /* Buttons */
  .up-btn-current {
    width: 100%; padding: 12px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    color: #8a9bb0; font-family: 'DM Sans', sans-serif;
    font-size: 14px; border-radius: 6px;
    cursor: not-allowed;
  }

  .up-btn-plus {
    width: 100%; padding: 12px;
    background: #c9a84c; border: none;
    color: #0d1f35; font-family: 'DM Sans', sans-serif;
    font-size: 14px; font-weight: 600; border-radius: 6px;
    cursor: pointer; transition: background 0.2s;
  }

  .up-btn-plus.coming-soon {
    opacity: 0.5; cursor: not-allowed;
  }

  .up-btn-plus.active {
    background: rgba(201,168,76,0.15);
    border: 1px solid rgba(201,168,76,0.3);
    color: #c9a84c; cursor: default;
  }

  .up-coming-hint {
    margin-top: 12px; font-size: 12px;
    color: #8a9bb0; text-align: center; line-height: 1.5;
  }

  .up-email-link { color: #c9a84c; text-decoration: none; }
  .up-email-link:hover { text-decoration: underline; }

  /* FAQ */
  .up-faq { margin-bottom: 48px; }

  .up-faq-title {
    font-family: 'Playfair Display', serif;
    font-size: 24px; font-weight: 600; color: #f5f0e8;
    margin-bottom: 24px;
  }

  .up-faq-item {
    border-top: 1px solid rgba(255,255,255,0.05);
    padding: 20px 0;
  }

  .up-faq-item:last-child { border-bottom: 1px solid rgba(255,255,255,0.05); }

  .up-faq-q {
    font-size: 15px; font-weight: 500; color: #f5f0e8;
    margin-bottom: 8px;
  }

  .up-faq-a {
    font-size: 14px; color: #8a9bb0; font-weight: 300; line-height: 1.6;
  }

  /* Footer */
  .up-footer {
    text-align: center;
    font-size: 11px; color: rgba(138,155,176,0.4);
    line-height: 1.6;
  }

  /* Spinner */
  .up-spinner {
    width: 36px; height: 36px;
    border: 2px solid rgba(201,168,76,0.2);
    border-top-color: #c9a84c;
    border-radius: 50%;
    animation: up-spin 0.7s linear infinite;
  }

  @keyframes up-spin { to { transform: rotate(360deg); } }

  /* Responsive */
  @media (max-width: 680px) {
    .up-nav { padding: 16px 20px; }
    .up-page { padding: 40px 16px 60px; }
    .up-title { font-size: 28px; }
    .up-cards { grid-template-columns: 1fr; }
  }
`;
