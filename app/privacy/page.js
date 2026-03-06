export default function PrivacyPage() {
  return (
    <>
      <style>{`
        :root {
          --navy:  #0D1F35;
          --navy2: #162d4a;
          --gold:  #C9A84C;
          --cream: #F5F0E8;
          --cream2: #ece5d6;
          --muted: #5a6e82;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .pp-wrap {
          font-family: 'DM Sans', sans-serif;
          background: var(--cream);
          color: var(--navy);
          min-height: 100vh;
        }
        .pp-header {
          background: var(--navy);
          padding: 48px 32px 40px;
          text-align: center;
        }
        .pp-logo {
          font-family: 'Playfair Display', serif;
          font-size: 28px;
          color: var(--gold);
          letter-spacing: 0.02em;
          margin-bottom: 24px;
          display: block;
          text-decoration: none;
        }
        .pp-header h1 {
          font-family: 'Playfair Display', serif;
          font-size: 36px;
          color: #fff;
          font-weight: 700;
          margin-bottom: 10px;
        }
        .pp-header p {
          font-size: 14px;
          color: rgba(255,255,255,0.45);
          letter-spacing: 0.04em;
        }
        .pp-body {
          max-width: 760px;
          margin: 0 auto;
          padding: 64px 32px 96px;
        }
        .pp-section {
          margin-bottom: 48px;
        }
        .pp-section h2 {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 600;
          color: var(--navy);
          margin-bottom: 16px;
          padding-bottom: 10px;
          border-bottom: 2px solid var(--cream2);
        }
        .pp-section p {
          font-size: 15px;
          color: #2c3e50;
          line-height: 1.8;
          margin-bottom: 12px;
        }
        .pp-section ul {
          margin: 8px 0 12px 0;
          padding-left: 0;
          list-style: none;
        }
        .pp-section ul li {
          font-size: 15px;
          color: #2c3e50;
          line-height: 1.7;
          padding: 5px 0 5px 20px;
          position: relative;
        }
        .pp-section ul li::before {
          content: '—';
          position: absolute;
          left: 0;
          color: var(--gold);
          font-weight: 600;
        }
        .pp-contact-box {
          background: #fff;
          border: 2px solid var(--cream2);
          border-radius: 10px;
          padding: 20px 24px;
          margin-top: 12px;
          font-size: 15px;
          line-height: 1.8;
          color: #2c3e50;
        }
        .pp-contact-box a {
          color: var(--gold);
          text-decoration: none;
          font-weight: 500;
        }
        .pp-contact-box a:hover { text-decoration: underline; }
        .pp-footer {
          background: var(--navy);
          text-align: center;
          padding: 32px;
          font-size: 13px;
          color: rgba(255,255,255,0.3);
        }
        .pp-footer a {
          color: rgba(255,255,255,0.5);
          text-decoration: none;
          margin: 0 12px;
        }
        .pp-footer a:hover { color: var(--gold); }
        a.pp-logo:hover { opacity: 0.85; }
      `}</style>

      <div className="pp-wrap">
        <header className="pp-header">
          <a href="/" className="pp-logo">Harbour</a>
          <h1>Privacy Policy</h1>
          <p>Effective date: March 2026 · Last updated: March 2026</p>
        </header>

        <div className="pp-body">

          <div className="pp-section">
            <h2>1. Who we are</h2>
            <p>Harbourapp.com.au. References to "Harbour", "we", "us", or "our" refer to this operator.</p>
            <p>Harbour provides general information only and is not a licensed financial services provider (AFSL).</p>
            <p>Contact for privacy matters:</p>
            <div className="pp-contact-box">
              Email: <a href="mailto:privacy@harbourapp.com.au">privacy@harbourapp.com.au</a><br />
              Website: <a href="https://harbourapp.com.au">harbourapp.com.au</a>
            </div>
          </div>

          <div className="pp-section">
            <h2>2. What information we collect</h2>
            <p>We collect the following personal information when you use Harbour:</p>
            <ul>
              <li><strong>Account information:</strong> email and password (securely stored via Supabase Auth)</li>
              <li><strong>Forecast inputs:</strong> name, age, super balance, salary, retirement age, annual spending</li>
              <li><strong>Forecast outputs:</strong> results of retirement projections saved to your account</li>
              <li><strong>Usage data:</strong> standard server logs (IP address, browser type, pages visited)</li>
            </ul>
            <p>We do not collect sensitive identifiers such as TFN, Medicare number, Centrelink numbers, or bank account details.</p>
          </div>

          <div className="pp-section">
            <h2>3. How we use your information</h2>
            <p>We use your information to:</p>
            <ul>
              <li>Create and manage accounts</li>
              <li>Run retirement forecasts based on your inputs</li>
              <li>Save and display your forecasts</li>
              <li>Send transactional emails (e.g., password reset)</li>
              <li>Improve and maintain Harbour</li>
              <li>Comply with legal obligations</li>
            </ul>
            <p>We do not sell or use your data for advertising.</p>
          </div>

          <div className="pp-section">
            <h2>4. How we store and protect your information</h2>
            <ul>
              <li>Data is stored securely via Supabase (Singapore) and hosted on Vercel (USA)</li>
              <li>Encryption in transit (TLS) and at rest; passwords hashed with bcrypt</li>
              <li>Row-level security ensures you can only access your own forecasts</li>
            </ul>
            <p><strong>Data breach:</strong> If a data breach likely to cause serious harm occurs, we will notify affected users and the OAIC as required under the Notifiable Data Breaches scheme.</p>
          </div>

          <div className="pp-section">
            <h2>5. Who we share your information with</h2>
            <p>We share data only with:</p>
            <ul>
              <li><strong>Supabase</strong> — database &amp; auth (Singapore)</li>
              <li><strong>Vercel</strong> — hosting (USA)</li>
              <li><strong>Resend</strong> — transactional email (USA)</li>
            </ul>
            <p>No other third parties are used for analytics, advertising, or data sales.</p>
          </div>

          <div className="pp-section">
            <h2>6. Overseas disclosure</h2>
            <p>By using Harbour, you acknowledge that some data will be stored overseas. We take reasonable steps to ensure these providers comply with the Australian Privacy Principles.</p>
          </div>

          <div className="pp-section">
            <h2>7. Cookies</h2>
            <ul>
              <li>Session cookies are required to keep you signed in</li>
              <li>No advertising or tracking cookies are used</li>
            </ul>
          </div>

          <div className="pp-section">
            <h2>8. Your rights</h2>
            <p>Under the Privacy Act 1988, you may:</p>
            <ul>
              <li>Access your personal information</li>
              <li>Request correction of inaccurate data</li>
              <li>Delete your account and all associated forecasts</li>
              <li>Make a privacy complaint</li>
            </ul>
            <p>Account deletion removes data within 30 days. Server logs are retained up to 90 days for security and debugging purposes.</p>
          </div>

          <div className="pp-section">
            <h2>9. Children's privacy</h2>
            <p>Harbour is intended for adults aged 25 and over. We do not knowingly collect data from anyone under 18. If we become aware of such data, we will delete it promptly.</p>
          </div>

          <div className="pp-section">
            <h2>10. Changes to this policy</h2>
            <p>Updates will revise the effective date. Material changes will be notified via email or in-app notice. Continued use of Harbour constitutes acceptance of the updated policy.</p>
          </div>

          <div className="pp-section">
            <h2>11. Complaints</h2>
            <p>Contact us first at <a href="mailto:privacy@harbourapp.com.au" style={{color:'var(--gold)', fontWeight:500}}>privacy@harbourapp.com.au</a>.</p>
            <p>If unsatisfied, complaints may be lodged with the Office of the Australian Information Commissioner (OAIC) at <a href="https://www.oaic.gov.au" target="_blank" rel="noopener noreferrer" style={{color:'var(--gold)', fontWeight:500}}>oaic.gov.au</a>.</p>
          </div>

        </div>

        <footer className="pp-footer">
          <div>
            <a href="/terms">Terms of Service</a>
            <a href="/privacy">Privacy Policy</a>
            <a href="/">Home</a>
          </div>
          <div style={{marginTop:'12px'}}>© 2026 Harbour Pty Ltd · harbourapp.com.au · General information only — not financial advice.</div>
        </footer>
      </div>
    </>
  );
}
