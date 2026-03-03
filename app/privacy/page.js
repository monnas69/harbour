// app/privacy/page.js

export const metadata = {
  title: 'Privacy Policy — Harbour',
  description: 'How Harbour collects, uses, and protects your personal information.',
};

export default function PrivacyPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

        .pp-body {
          font-family: 'DM Sans', sans-serif;
          background: #0d1f35;
          color: #f5f0e8;
          min-height: 100vh;
          position: relative;
        }

        .pp-body::before {
          content: '';
          position: fixed; inset: 0;
          background-image:
            linear-gradient(rgba(201,168,76,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201,168,76,0.02) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none; z-index: 0;
        }

        .pp-nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 60px;
          border-bottom: 1px solid rgba(201,168,76,0.1);
          position: sticky; top: 0; z-index: 100;
          background: rgba(13,31,53,0.97);
          backdrop-filter: blur(10px);
        }

        .pp-logo {
          display: flex; align-items: center; gap: 10px;
          text-decoration: none;
        }

        .pp-logo-text {
          font-family: 'Playfair Display', serif;
          font-size: 20px; font-weight: 600;
          color: #f5f0e8; letter-spacing: 0.04em;
        }

        .pp-nav-link {
          font-size: 13px; color: #8a9bb0;
          text-decoration: none; transition: color 0.2s;
        }
        .pp-nav-link:hover { color: #f5f0e8; }

        .pp-main {
          max-width: 760px;
          margin: 0 auto;
          padding: 60px 40px 100px;
          position: relative; z-index: 1;
        }

        .pp-eyebrow {
          font-size: 11px; letter-spacing: 0.16em;
          text-transform: uppercase; color: #c9a84c;
          font-weight: 500; margin-bottom: 12px;
          display: flex; align-items: center; gap: 10px;
        }

        .pp-eyebrow::before {
          content: '';
          display: inline-block;
          width: 24px; height: 1px;
          background: #c9a84c; opacity: 0.6;
        }

        .pp-title {
          font-family: 'Playfair Display', serif;
          font-size: 42px; font-weight: 700;
          color: #f5f0e8; line-height: 1.1;
          margin-bottom: 16px;
        }

        .pp-meta {
          font-size: 13px; color: #8a9bb0;
          font-weight: 300; margin-bottom: 48px;
          padding-bottom: 32px;
          border-bottom: 1px solid rgba(201,168,76,0.1);
        }

        .pp-section {
          margin-bottom: 40px;
        }

        .pp-section-title {
          font-family: 'Playfair Display', serif;
          font-size: 20px; font-weight: 600;
          color: #f5f0e8; margin-bottom: 14px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(201,168,76,0.1);
        }

        .pp-p {
          font-size: 15px; font-weight: 300;
          color: #b8c4d0; line-height: 1.75;
          margin-bottom: 14px;
        }

        .pp-p:last-child { margin-bottom: 0; }

        .pp-p a {
          color: #c9a84c; text-decoration: none;
          border-bottom: 1px solid rgba(201,168,76,0.3);
          transition: border-color 0.2s;
        }
        .pp-p a:hover { border-color: #c9a84c; }

        .pp-list {
          list-style: none;
          margin: 12px 0 14px;
        }

        .pp-list li {
          font-size: 15px; font-weight: 300;
          color: #b8c4d0; line-height: 1.75;
          padding: 5px 0 5px 20px;
          position: relative;
          border-bottom: 1px solid rgba(255,255,255,0.03);
        }

        .pp-list li:last-child { border-bottom: none; }

        .pp-list li::before {
          content: '';
          position: absolute; left: 0; top: 14px;
          width: 6px; height: 6px; border-radius: 50%;
          background: rgba(201,168,76,0.5);
        }

        .pp-highlight {
          background: rgba(20,41,68,0.7);
          border: 1px solid rgba(201,168,76,0.15);
          border-left: 3px solid rgba(201,168,76,0.5);
          border-radius: 0 4px 4px 0;
          padding: 16px 20px;
          margin: 20px 0;
          font-size: 14px; font-weight: 300;
          color: #b8c4d0; line-height: 1.7;
          font-style: italic;
        }

        .pp-contact-card {
          background: rgba(20,41,68,0.6);
          border: 1px solid rgba(201,168,76,0.15);
          border-radius: 6px;
          padding: 24px 28px;
          margin-top: 16px;
        }

        .pp-contact-card p {
          font-size: 14px; font-weight: 300;
          color: #b8c4d0; line-height: 1.75;
          margin-bottom: 6px;
        }

        .pp-contact-card p:last-child { margin-bottom: 0; }

        .pp-contact-card a {
          color: #c9a84c; text-decoration: none;
        }

        .pp-footer {
          margin-top: 60px;
          padding-top: 28px;
          border-top: 1px solid rgba(201,168,76,0.1);
          font-size: 12px; color: rgba(138,155,176,0.5);
          line-height: 1.6;
        }
      `}</style>

      <div className="pp-body">

        {/* Nav */}
        <nav className="pp-nav">
          <a href="/" className="pp-logo">
            <svg viewBox="0 0 36 36" fill="none" width="28" height="28">
              <circle cx="18" cy="18" r="17" stroke="#c9a84c" strokeWidth="1"/>
              <line x1="18" y1="7" x2="18" y2="29" stroke="#c9a84c" strokeWidth="1.5"/>
              <line x1="11" y1="14" x2="25" y2="14" stroke="#c9a84c" strokeWidth="1.5"/>
              <path d="M11 29 Q18 24 25 29" stroke="#c9a84c" strokeWidth="1.5" fill="none"/>
            </svg>
            <span className="pp-logo-text">Harbour</span>
          </a>
          <a href="/" className="pp-nav-link">← Back to Harbour</a>
        </nav>

        {/* Content */}
        <main className="pp-main">

          <div className="pp-eyebrow">Legal</div>
          <h1 className="pp-title">Privacy Policy</h1>
          <p className="pp-meta">
            Effective date: March 2026 &nbsp;·&nbsp; Last updated: March 2026
          </p>

          <div className="pp-highlight">
            Harbour is committed to protecting your privacy. This policy explains what personal information we collect, how we use it, and your rights under the Australian Privacy Act 1988.
          </div>

          {/* 1 */}
          <div className="pp-section">
            <h2 className="pp-section-title">1. Who we are</h2>
            <p className="pp-p">
              Harbour is an Australian web application that provides retirement forecasting tools for individuals. References to "Harbour", "we", "us" or "our" in this policy refer to the operator of harbour.com.au.
            </p>
            <p className="pp-p">
              Harbour provides general information only. It does not provide financial advice and is not an Australian Financial Services Licence (AFSL) holder.
            </p>
          </div>

          {/* 2 */}
          <div className="pp-section">
            <h2 className="pp-section-title">2. What information we collect</h2>
            <p className="pp-p">We collect the following personal information when you use Harbour:</p>
            <ul className="pp-list">
              <li><strong style={{color:'#f5f0e8',fontWeight:500}}>Account information</strong> — your email address and password (stored securely via Supabase Auth)</li>
              <li><strong style={{color:'#f5f0e8',fontWeight:500}}>Forecast inputs</strong> — your name (used for personalisation only), current age, superannuation balance, annual salary, target retirement age, and annual spending</li>
              <li><strong style={{color:'#f5f0e8',fontWeight:500}}>Forecast outputs</strong> — the results of your retirement projections, saved to your account</li>
              <li><strong style={{color:'#f5f0e8',fontWeight:500}}>Usage data</strong> — standard server logs including IP address, browser type, and pages visited</li>
            </ul>
            <p className="pp-p">
              We do not collect your Tax File Number, Medicare number, Centrelink Customer Reference Number, bank account details, or any government-issued identifiers.
            </p>
          </div>

          {/* 3 */}
          <div className="pp-section">
            <h2 className="pp-section-title">3. How we use your information</h2>
            <p className="pp-p">We use your personal information to:</p>
            <ul className="pp-list">
              <li>Create and manage your Harbour account</li>
              <li>Run retirement forecasts based on the inputs you provide</li>
              <li>Save and display your saved forecasts within your account</li>
              <li>Send transactional emails such as password reset links</li>
              <li>Improve the Harbour service and fix technical issues</li>
              <li>Comply with our legal obligations</li>
            </ul>
            <p className="pp-p">
              We do not use your information for advertising, and we do not sell your personal information to third parties.
            </p>
          </div>

          {/* 4 */}
          <div className="pp-section">
            <h2 className="pp-section-title">4. How we store and protect your information</h2>
            <p className="pp-p">
              Your data is stored securely using Supabase, a managed database platform hosted in Singapore. Supabase uses industry-standard encryption in transit (TLS) and at rest. Access to your data is restricted by row-level security — you can only access your own forecasts.
            </p>
            <p className="pp-p">
              Your password is never stored in plain text. Authentication is handled by Supabase Auth using bcrypt hashing.
            </p>
            <p className="pp-p">
              Harbour is hosted on Vercel, a cloud platform with enterprise-grade security controls. All data transmitted between your browser and Harbour is encrypted via HTTPS.
            </p>
          </div>

          {/* 5 */}
          <div className="pp-section">
            <h2 className="pp-section-title">5. Who we share your information with</h2>
            <p className="pp-p">We share your information only with the following service providers, and only to the extent necessary to operate Harbour:</p>
            <ul className="pp-list">
              <li><strong style={{color:'#f5f0e8',fontWeight:500}}>Supabase</strong> — database and authentication (Singapore)</li>
              <li><strong style={{color:'#f5f0e8',fontWeight:500}}>Vercel</strong> — web hosting and deployment (USA)</li>
              <li><strong style={{color:'#f5f0e8',fontWeight:500}}>Resend</strong> — transactional email delivery (USA)</li>
            </ul>
            <p className="pp-p">
              We do not share your personal information with any other third parties, advertisers, data brokers, or analytics platforms.
            </p>
          </div>

          {/* 6 */}
          <div className="pp-section">
            <h2 className="pp-section-title">6. Overseas disclosure</h2>
            <p className="pp-p">
              Some of our service providers are located overseas (in the United States and Singapore). By using Harbour, you consent to your personal information being transferred to and stored in those countries. We take reasonable steps to ensure those providers handle your data in accordance with the Australian Privacy Principles.
            </p>
          </div>

          {/* 7 */}
          <div className="pp-section">
            <h2 className="pp-section-title">7. Cookies and tracking</h2>
            <p className="pp-p">
              Harbour uses session cookies to keep you signed in. These are essential cookies required for the application to function and cannot be disabled while you are using Harbour.
            </p>
            <p className="pp-p">
              We do not use advertising cookies, tracking pixels, or third-party analytics platforms such as Google Analytics.
            </p>
          </div>

          {/* 8 */}
          <div className="pp-section">
            <h2 className="pp-section-title">8. Your rights</h2>
            <p className="pp-p">Under the Australian Privacy Act 1988, you have the right to:</p>
            <ul className="pp-list">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate or out-of-date information</li>
              <li>Request deletion of your account and all associated data</li>
              <li>Make a complaint about how we have handled your personal information</li>
            </ul>
            <p className="pp-p">
              You can delete your account at any time from your dashboard. This permanently deletes your account and all saved forecasts. To request a copy of your data or make a privacy complaint, contact us using the details below.
            </p>
          </div>

          {/* 9 */}
          <div className="pp-section">
            <h2 className="pp-section-title">9. Data retention</h2>
            <p className="pp-p">
              We retain your account information and saved forecasts for as long as your account is active. If you delete your account, all associated data is permanently deleted within 30 days.
            </p>
            <p className="pp-p">
              Server logs are retained for up to 90 days for security and debugging purposes, after which they are automatically deleted.
            </p>
          </div>

          {/* 10 */}
          <div className="pp-section">
            <h2 className="pp-section-title">10. Children's privacy</h2>
            <p className="pp-p">
              Harbour is intended for adults aged 25 and over. We do not knowingly collect personal information from anyone under the age of 18. If you believe a minor has provided us with personal information, please contact us and we will delete it promptly.
            </p>
          </div>

          {/* 11 */}
          <div className="pp-section">
            <h2 className="pp-section-title">11. Changes to this policy</h2>
            <p className="pp-p">
              We may update this Privacy Policy from time to time. When we do, we will update the effective date at the top of this page. If we make material changes, we will notify you by email or by displaying a notice within the application. Continued use of Harbour after any changes constitutes your acceptance of the updated policy.
            </p>
          </div>

          {/* 12 */}
          <div className="pp-section">
            <h2 className="pp-section-title">12. Complaints</h2>
            <p className="pp-p">
              If you have a complaint about how we have handled your personal information, please contact us first using the details below. We will respond within 30 days.
            </p>
            <p className="pp-p">
              If you are not satisfied with our response, you may lodge a complaint with the Office of the Australian Information Commissioner (OAIC) at <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer">oaic.gov.au</a>.
            </p>
          </div>

          {/* 13 */}
          <div className="pp-section">
            <h2 className="pp-section-title">13. Contact us</h2>
            <p className="pp-p">For privacy enquiries, data access requests, or to delete your account:</p>
            <div className="pp-contact-card">
              <p><strong style={{color:'#f5f0e8',fontWeight:500}}>Harbour</strong></p>
              <p>Email: <a href="mailto:privacy@harbour.com.au">privacy@harbour.com.au</a></p>
              <p>Website: <a href="https://harbour.com.au">harbour.com.au</a></p>
            </div>
          </div>

          <div className="pp-footer">
            This Privacy Policy is written in plain English in accordance with the Australian Privacy Act 1988 (Cth) and the Australian Privacy Principles (APPs). Harbour is not a legal or financial services firm — if you have complex privacy concerns we recommend seeking independent legal advice.
          </div>

        </main>
      </div>
    </>
  );
}