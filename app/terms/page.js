export default function TermsPage() {
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
        .pp-callout {
          background: rgba(201,168,76,0.08);
          border: 1.5px solid rgba(201,168,76,0.3);
          border-radius: 10px;
          padding: 18px 22px;
          margin: 16px 0;
          font-size: 15px;
          color: var(--navy);
          line-height: 1.7;
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
      `}</style>

      <div className="pp-wrap">
        <header className="pp-header">
          <a href="/" className="pp-logo">Harbour</a>
          <h1>Terms of Service</h1>
          <p>Effective date: March 2026 · Last updated: March 2026</p>
        </header>

        <div className="pp-body">

          <div className="pp-section">
            <h2>1. About Harbour</h2>
            <p>Harbour is an Australian web application providing retirement forecasting tools. By accessing or using Harbour, you agree to these Terms. If you do not agree, do not use the service.</p>
            <div className="pp-contact-box">
              <strong>Operator:</strong> Harbour Pty Ltd (ABN XX XXX XXX XXX), Perth, WA
            </div>
          </div>

          <div className="pp-section">
            <h2>2. Eligibility</h2>
            <p>You must be at least 25 years old to use Harbour.</p>
          </div>

          <div className="pp-section">
            <h2>3. General information only — not financial advice</h2>
            <div className="pp-callout">
              Harbour is not licensed under an Australian Financial Services Licence (AFSL) and provides general information only. Forecasts and projections are illustrative and are not guarantees or personal recommendations. Always seek advice from a licensed financial adviser or verify your personal entitlements with Services Australia before making retirement decisions.
            </div>
          </div>

          <div className="pp-section">
            <h2>4. Accuracy of information</h2>
            <ul>
              <li>Harbour uses current Centrelink rates, ATO superannuation rules, and ASFA standards</li>
              <li>Results depend entirely on the inputs you provide</li>
              <li>Monte Carlo simulations model potential outcomes based on assumed return distributions</li>
              <li>Past performance does not guarantee future results</li>
            </ul>
          </div>

          <div className="pp-section">
            <h2>5. No reliance / user responsibility</h2>
            <ul>
              <li>Forecasts are illustrative and educational only</li>
              <li>You must not rely solely on Harbour for financial decisions</li>
              <li>You are responsible for verifying your own assumptions and projections</li>
            </ul>
            <p style={{marginTop:'16px'}}><strong>Scenario transparency:</strong> All forecasts clearly display your entered assumptions (retirement age, spending, super balance, etc.). Probabilities and outputs are illustrative projections, not personal recommendations.</p>
          </div>

          <div className="pp-section">
            <h2>6. Your account</h2>
            <ul>
              <li>Accounts require a secure email and password</li>
              <li>Do not share your account with others</li>
              <li>Notify Harbour immediately of any unauthorised access</li>
              <li>Accounts may be suspended for breach of these Terms or extended inactivity</li>
            </ul>
          </div>

          <div className="pp-section">
            <h2>7. Acceptable use</h2>
            <p>You must not:</p>
            <ul>
              <li>Provide false or misleading information</li>
              <li>Attempt to gain unauthorised access to Harbour systems</li>
              <li>Scrape or reproduce Harbour content at scale</li>
              <li>Resell or redistribute forecast outputs without permission</li>
              <li>Violate any applicable Australian or international law</li>
            </ul>
          </div>

          <div className="pp-section">
            <h2>8. Intellectual property</h2>
            <p>Harbour's content, code, and methodology is owned by or licensed to Harbour Pty Ltd. You may download, print, or share your own forecast outputs for personal use only.</p>
          </div>

          <div className="pp-section">
            <h2>9. Limitation of liability</h2>
            <p>Harbour is not liable for:</p>
            <ul>
              <li>Financial decisions made based on Harbour forecasts</li>
              <li>Inaccurate results caused by incorrect inputs</li>
              <li>Loss of saved data or service interruptions</li>
              <li>Indirect, consequential, or economic loss of any kind</li>
            </ul>
            <p style={{marginTop:'16px'}}><strong>Liability cap:</strong> To the maximum extent permitted by law, our total liability is limited to the fees you paid in the prior 12 months (if any).</p>
            <p>Nothing in these Terms limits your rights under the Australian Consumer Law.</p>
          </div>

          <div className="pp-section">
            <h2>10. Service availability</h2>
            <p>Harbour aims to be available at all times but may be suspended or temporarily unavailable for maintenance, upgrades, or circumstances outside our control.</p>
          </div>

          <div className="pp-section">
            <h2>11. Changes to these terms</h2>
            <p>We may update these Terms at any time. The effective date will be revised. Material changes will be notified via email or in-app notice. Continued use of Harbour after changes constitutes acceptance of the updated Terms.</p>
          </div>

          <div className="pp-section">
            <h2>12. Governing law</h2>
            <p>These Terms are governed by the laws of Western Australia. You submit to the exclusive jurisdiction of the courts of Australia.</p>
          </div>

          <div className="pp-section">
            <h2>13. Contact</h2>
            <div className="pp-contact-box">
              <strong>Harbour Pty Ltd</strong><br />
              Email: <a href="mailto:legal@harbourapp.com.au">legal@harbourapp.com.au</a><br />
              Website: <a href="https://harbourapp.com.au">harbourapp.com.au</a>
            </div>
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
