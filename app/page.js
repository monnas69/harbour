'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [retired, setRetired] = useState(false);

  const go = (mode) => {
    router.push(`/forecast/new?mode=${mode}&retired=${retired}`);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'DM Sans', sans-serif; background: #0d1f35; color: #f5f0e8; min-height: 100vh; }

        .lp-root { min-height: 100vh; background: #0d1f35; position: relative; overflow-x: hidden; }

        .lp-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(201,168,76,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201,168,76,0.025) 1px, transparent 1px);
          background-size: 64px 64px;
          pointer-events: none;
          z-index: 0;
        }

        /* Nav */
        .lp-nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 48px;
          border-bottom: 1px solid rgba(201,168,76,0.1);
          position: relative; z-index: 10;
        }
        .lp-logo {
          font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 600;
          color: #f5f0e8; letter-spacing: 0.04em; text-decoration: none;
          display: flex; align-items: center; gap: 10px;
        }
        .lp-nav-links { display: flex; align-items: center; gap: 8px; }
        .lp-nav-link {
          padding: 8px 18px; font-size: 14px; font-weight: 500; color: #8a9bb0;
          text-decoration: none; border-radius: 4px; transition: color 0.2s;
        }
        .lp-nav-link:hover { color: #f5f0e8; }
        .lp-nav-btn {
          padding: 9px 20px; font-size: 14px; font-weight: 500; color: #c9a84c;
          background: transparent; border: 1px solid rgba(201,168,76,0.35);
          border-radius: 4px; cursor: pointer; text-decoration: none; transition: all 0.2s;
        }
        .lp-nav-btn:hover { background: rgba(201,168,76,0.08); border-color: #c9a84c; }

        /* Main */
        .lp-main {
          position: relative; z-index: 1;
          max-width: 780px; margin: 0 auto;
          padding: 72px 24px 80px;
          display: flex; flex-direction: column; align-items: center; text-align: center;
        }

        .lp-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 16px;
          background: rgba(201,168,76,0.1); border: 1px solid rgba(201,168,76,0.25);
          border-radius: 100px;
          font-size: 12px; font-weight: 500; color: #c9a84c;
          letter-spacing: 0.06em; text-transform: uppercase;
          margin-bottom: 32px;
        }

        .lp-headline {
          font-family: 'Playfair Display', serif; font-size: 52px; font-weight: 700;
          color: #f5f0e8; line-height: 1.15; margin-bottom: 20px; letter-spacing: -0.01em;
        }
        .lp-headline em { color: #c9a84c; font-style: italic; }

        .lp-subhead {
          font-size: 18px; color: #8a9bb0; font-weight: 300; line-height: 1.6;
          margin-bottom: 52px; max-width: 520px;
        }

        /* Retired toggle */
        .lp-retired-wrap { margin-bottom: 28px; width: 100%; max-width: 460px; }

        .lp-retired-label {
          font-size: 11px; font-weight: 500; color: #8a9bb0;
          letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 12px;
        }

        .lp-retired-toggle {
          display: flex;
          background: rgba(20,41,68,0.6); border: 1px solid rgba(201,168,76,0.15);
          border-radius: 8px; overflow: hidden;
        }
        .lp-retired-btn {
          flex: 1; padding: 13px 20px; border: none; background: transparent;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 400;
          color: #8a9bb0; cursor: pointer; transition: all 0.2s; position: relative;
        }
        .lp-retired-btn:first-child { border-right: 1px solid rgba(201,168,76,0.15); }
        .lp-retired-btn.active { background: rgba(201,168,76,0.12); color: #f5f0e8; font-weight: 500; }
        .lp-retired-btn.active::after {
          content: ''; position: absolute; bottom: 0; left: 0; right: 0;
          height: 2px; background: #c9a84c;
        }

        /* CTA cards */
        .lp-cta-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
          width: 100%; margin-bottom: 48px;
        }
        .lp-cta-card {
          position: relative; display: flex; flex-direction: column; align-items: flex-start;
          text-align: left; padding: 28px 28px 24px;
          background: rgba(20,41,68,0.7); border: 1px solid rgba(201,168,76,0.15);
          border-radius: 10px; cursor: pointer; transition: all 0.25s;
          font-family: 'DM Sans', sans-serif; backdrop-filter: blur(10px); overflow: hidden;
        }
        .lp-cta-card::after {
          content: ''; position: absolute; bottom: 0; left: 0; right: 0;
          height: 2px; background: rgba(201,168,76,0.25); transition: background 0.2s;
        }
        .lp-cta-card:hover {
          border-color: rgba(201,168,76,0.4);
          transform: translateY(-3px);
          box-shadow: 0 16px 48px rgba(0,0,0,0.35);
        }
        .lp-cta-card:hover::after { background: #c9a84c; }

        .lp-cta-card.lp-cta-primary {
          background: rgba(201,168,76,0.1); border-color: rgba(201,168,76,0.35);
        }
        .lp-cta-card.lp-cta-primary::after { background: #c9a84c; }

        .lp-cta-icon { font-size: 28px; margin-bottom: 14px; display: block; }
        .lp-cta-title {
          font-family: 'Playfair Display', serif; font-size: 20px; font-weight: 600;
          color: #f5f0e8; line-height: 1.25; margin-bottom: 10px;
        }
        .lp-cta-desc { font-size: 13px; color: #8a9bb0; line-height: 1.55; font-weight: 300; flex: 1; }
        .lp-cta-arrow {
          margin-top: 20px; font-size: 18px; color: #c9a84c;
          align-self: flex-end; transition: transform 0.2s;
        }
        .lp-cta-card:hover .lp-cta-arrow { transform: translateX(4px); }

        /* Feature pills */
        .lp-features { display: flex; gap: 32px; flex-wrap: wrap; justify-content: center; }
        .lp-feature { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #8a9bb0; }
        .lp-feature-icon { font-size: 15px; opacity: 0.8; }

        /* Footer */
        .lp-footer {
          position: relative; z-index: 1; text-align: center;
          padding: 0 24px 40px; font-size: 11px; color: rgba(138,155,176,0.4);
          line-height: 1.7; max-width: 600px; margin: 0 auto;
        }

        @media (max-width: 640px) {
          .lp-nav { padding: 16px 20px; }
          .lp-main { padding: 48px 20px 60px; }
          .lp-headline { font-size: 34px; }
          .lp-subhead { font-size: 16px; margin-bottom: 36px; }
          .lp-cta-grid { grid-template-columns: 1fr; }
          .lp-features { gap: 16px; }
        }
      `}</style>

      <div className="lp-root">
        {/* Nav */}
        <nav className="lp-nav">
          <a href="/" className="lp-logo">
            <svg width="26" height="26" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="17" stroke="#c9a84c" strokeWidth="1.2"/>
              <line x1="18" y1="7" x2="18" y2="29" stroke="#c9a84c" strokeWidth="1.5"/>
              <line x1="11" y1="14" x2="25" y2="14" stroke="#c9a84c" strokeWidth="1.5"/>
              <path d="M11 29 Q18 24 25 29" stroke="#c9a84c" strokeWidth="1.5" fill="none"/>
            </svg>
            Harbour
          </a>
          <div className="lp-nav-links">
            <a href="/auth/login" className="lp-nav-link">Sign in</a>
            <a href="/dashboard" className="lp-nav-btn">Dashboard</a>
          </div>
        </nav>

        {/* Hero */}
        <main className="lp-main">
          <div className="lp-badge">
            <span>⚓</span> Monte Carlo retirement forecasting · Australian
          </div>

          <h1 className="lp-headline">
            Understand your retirement —<br />
            not just your balance,<br />
            but your <em>lifestyle</em>.
          </h1>

          <p className="lp-subhead">
            Harbour projects your super, Age Pension, and safe spending in minutes —
            using 1,000 simulated market scenarios. Free, no credit card.
          </p>

          {/* Step 1: Are you retired? */}
          <div className="lp-retired-wrap">
            <div className="lp-retired-label">Are you already retired?</div>
            <div className="lp-retired-toggle">
              <button
                className={`lp-retired-btn${!retired ? ' active' : ''}`}
                onClick={() => setRetired(false)}
              >
                No — still working
              </button>
              <button
                className={`lp-retired-btn${retired ? ' active' : ''}`}
                onClick={() => setRetired(true)}
              >
                Yes — already retired
              </button>
            </div>
          </div>

          {/* Step 2: What do you want to know? */}
          <div className="lp-cta-grid">
            <button className="lp-cta-card" onClick={() => go('traditional')}>
              <span className="lp-cta-icon">📊</span>
              <div className="lp-cta-title">How much will I have?</div>
              <div className="lp-cta-desc">
                {retired
                  ? 'See how long your money is projected to last across a range of market scenarios'
                  : 'Project your super and retirement balance over time with best, median, and worst-case scenarios'}
              </div>
              <div className="lp-cta-arrow">→</div>
            </button>

            <button className="lp-cta-card lp-cta-primary" onClick={() => go('safe_spending')}>
              <span className="lp-cta-icon">💰</span>
              <div className="lp-cta-title">How much can I safely spend?</div>
              <div className="lp-cta-desc">
                {retired
                  ? 'Find out what you can realistically spend each year in retirement — with Age Pension factored in'
                  : 'Reverse-engineer your maximum safe annual spending to a target age'}
              </div>
              <div className="lp-cta-arrow">→</div>
            </button>
          </div>

          {/* Feature pills */}
          <div className="lp-features">
            <div className="lp-feature"><span className="lp-feature-icon">⚡</span> 1,000 Monte Carlo scenarios</div>
            <div className="lp-feature"><span className="lp-feature-icon">⚓</span> Age Pension included</div>
            <div className="lp-feature"><span className="lp-feature-icon">🔒</span> Free — no credit card</div>
            <div className="lp-feature"><span className="lp-feature-icon">🇦🇺</span> Australian super rules</div>
          </div>
        </main>

        <footer className="lp-footer">
          For general information only. Not financial advice. Harbour does not hold an AFSL.
          Always verify with Services Australia or a licensed financial adviser before making retirement decisions.
        </footer>
      </div>
    </>
  );
}
