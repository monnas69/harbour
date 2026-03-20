'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function UpgradeSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.push('/dashboard'), 5000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

        .suc-root {
          font-family: 'DM Sans', sans-serif;
          background: #0d1f35;
          color: #f5f0e8;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .suc-root::before {
          content: '';
          position: fixed; inset: 0;
          background-image:
            linear-gradient(rgba(201,168,76,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201,168,76,0.02) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none; z-index: 0;
        }

        .suc-box {
          position: relative; z-index: 1;
          text-align: center;
          padding: 60px 40px;
          max-width: 480px;
        }

        .suc-icon {
          width: 72px; height: 72px;
          background: rgba(126,200,150,0.12);
          border: 1px solid rgba(126,200,150,0.3);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 28px;
          font-size: 28px;
        }

        .suc-badge {
          display: inline-block;
          background: rgba(201,168,76,0.12);
          border: 1px solid rgba(201,168,76,0.3);
          color: #c9a84c;
          font-size: 12px; font-weight: 500;
          letter-spacing: 0.1em; text-transform: uppercase;
          padding: 5px 16px; border-radius: 20px;
          margin-bottom: 20px;
        }

        .suc-title {
          font-family: 'Playfair Display', serif;
          font-size: 36px; font-weight: 700;
          color: #f5f0e8; line-height: 1.2;
          margin-bottom: 16px;
        }

        .suc-title em { color: #e8cc88; font-style: italic; }

        .suc-sub {
          font-size: 16px; color: #8a9bb0;
          font-weight: 300; line-height: 1.6;
          margin-bottom: 36px;
        }

        .suc-btn {
          display: inline-block;
          background: #c9a84c; color: #0d1f35;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px; font-weight: 600;
          padding: 13px 28px; border-radius: 6px;
          text-decoration: none; cursor: pointer;
          transition: background 0.2s;
        }
        .suc-btn:hover { background: #e8cc88; }

        .suc-redirect {
          margin-top: 20px;
          font-size: 12px; color: rgba(138,155,176,0.5);
        }
      `}</style>

      <div className="suc-root">
        <div className="suc-box">
          <div className="suc-icon">✓</div>
          <div className="suc-badge">✦ Harbour Plus</div>
          <h1 className="suc-title">Welcome to<br /><em>Harbour Plus</em></h1>
          <p className="suc-sub">
            Your subscription is active. Unlimited forecasts, partner planning, and PDF export are now unlocked.
          </p>
          <a href="/dashboard" className="suc-btn">Go to dashboard →</a>
          <p className="suc-redirect">Redirecting automatically in 5 seconds…</p>
        </div>
      </div>
    </>
  );
}
