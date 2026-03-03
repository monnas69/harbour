// app/terms/page.js

export const metadata = {
  title: 'Terms of Service — Harbour',
  description: 'Terms and conditions for using the Harbour retirement forecasting service.',
};

export default function TermsPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

        .tos-body {
          font-family: 'DM Sans', sans-serif;
          background: #0d1f35;
          color: #f5f0e8;
          min-height: 100vh;
          position: relative;
        }

        .tos-body::before {
          content: '';
          position: fixed; inset: 0;
          background-image:
            linear-gradient(rgba(201,168,76,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201,168,76,0.02) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none; z-index: 0;
        }

        .tos-nav {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 60px;
          border-bottom: 1px solid rgba(201,168,76,0.1);
          position: sticky; top: 0; z-index: 100;
          background: rgba(13,31,53,0.97);
          backdrop-filter: blur(10px);
        }

        .tos-logo {
          display: flex; align-items: center; gap: 10px;
          text-decoration: none;
        }

        .tos-logo-text {
          font-family: 'Playfair Display', serif;
          font-size: 20px; font-weight: 600;
          color: #f5f0e8; letter-spacing: 0.04em;
        }

        .tos-nav-link {
          font-size: 13px; color: #8a9bb0;
          text-decoration: none; transition: color 0.2s;
        }
        .tos-nav-link:hover { color: #f5f0e8; }

        .tos-main {
          max-width: 760px;
          margin: 0 auto;
          padding: 60px 40px 100px;
          position: relative; z-index: 1;
        }

        .tos-eyebrow {
          font-size: 11px; letter-spacing: 0.16em;
          text-transform: uppercase; color: #c9a84c;
          font-weight: 500; margin-bottom: 12px;
          display: flex; align-items: center; gap: 10px;
        }

        .tos-eyebrow::before {
          content: '';
          display: inline-block;
          width: 24px; height: 1px;
          background: #c9a84c; opacity: 0.6;
        }

        .tos-title {
          font-family: 'Playfair Display', serif;
          font-size: 42px; font-weight: 700;
          color: #f5f0e8; line-height: 1.1;
          margin-bottom: 16px;
        }

        .tos-meta {
          font-size: 13px; color: #8a9bb0;
          font-weight: 300; margin-bottom: 48px;
          padding-bottom: 32px;
          border-bottom: 1px solid rgba(201,168,76,0.1);
        }

        .tos-section {
          margin-bottom: 40px;
        }

        .tos-section-title {
          font-family: 'Playfair Display', serif;
          font-size: 20px; font-weight: 600;
          color: #f5f0e8; margin-bottom: 14px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(201,168,76,0.1);
        }

        .tos-p {
          font-size: 15px; font-weight: 300;
          color: #b8c4d0; line-height: 1.75;
          margin-bottom: 14px;
        }

        .tos-p:last-child { margin-bottom: 0; }

        .tos-p a {
          color: #c9a84c; text-decoration: none;
          border-bottom: 1px solid rgba(201,168,76,0.3);
          transition: border-color 0.2s;
        }
        .tos-p a:hover { border-color: #c9a84c; }

        .tos-list {
          list-style: none;
          margin: 12px 0 14px;
        }

        .tos-list li {
          font-size: 15px; font-weight: 300;
          color: #b8c4d0; line-height: 1.75;
          padding: 5px 0 5px 20px;
          position: relative;
          border-bottom: 1px solid rgba(255,255,255,0.03);
        }

        .tos-list li:last-child { border-bottom: none; }

        .tos-list li::before {
          content: '';
          position: absolute; left: 0; top: 14px;
          width: 6px; height: 6px; border-radius: 50%;
          background: rgba(201,168,76,0.5);
        }

        .tos-highlight {
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

        .tos-warning {
          background: rgba(192,97,74,0.08);
          border: 1px solid rgba(192,97,74,0.2);
          border-left: 3px solid rgba(192,97,74,0.5);
          border-radius: 0 4px 4px 0;
          padding: 16px 20px;
          margin: 20px 0;
          font-size: 14px; font-weight: 300;
          color: #b8c4d0; line-height: 1.7;
        }

        .tos-contact-card {
          background: rgba(20,41,68,0.6);
          border: 1px solid rgba(201,168,76,0.15);
          border-radius: 6px;
          padding: 24px 28px;
          margin-top: 16px;
        }

        .tos-contact-card p {
          font-size: 14px; font-weight: 300;
          color: #b8c4d0; line-height: 1.75;
          margin-bottom: 6px;
        }

        .tos-contact-card p:last-child { margin-bottom: 0; }

        .tos-contact-card a {
          color: #c9a84c; text-decoration: none;
        }

        .tos-footer {
          margin-top: 60px;
          padding-top: 28px;
          border-top: 1px solid rgba(201,168,76,0.1);
          font-size: 12px; color: rgba(138,155,176,0.5);
          line-height: 1.6;
        }
      `}</style>

      <div className="tos-body">

        {/* Nav */}
        <nav className="tos-nav">
          <a href="/" className="tos-logo">
            <svg viewBox="0 0 36 36" fill="none" width="28" height="28">
              <circle cx="18" cy="18" r="17" stroke="#c9a84c" strokeWidth="1"/>
              <line x1="18" y1="7" x2="18" y2="29" stroke="#c9a84c" strokeWidth="1.5"/>
              <line x1="11" y1="14" x2="25" y2="14" stroke="#c9a84c" strokeWidth="1.5"/>
              <path d="M11 29 Q18 24 25 29" stroke="#c9a84c" strokeWidth="1.5" fill="none"/>
            </svg>
            <span className="tos-logo-text">Harbour</span>
          </a>
          <a href="/" className="tos-nav-link">← Back to Harbour</a>
        </nav>

        {/* Content */}
        <main className="tos-main">

          <div className="tos-eyebrow">Legal</div>
          <h1 className="tos-title">Terms of Service</h1>
          <p className="tos-meta">
            Effective date: March 2026 &nbsp;·&nbsp; Last updated: March 2026
          </p>

          <div className="tos-warning">
            <strong style={{color:'#f5f0e8',fontWeight:500}}>Important:</strong> Harbour provides general information only. It does not provide financial advice. Forecasts are projections based on modelled assumptions and are not guaranteed outcomes. Always verify your personal entitlements with Services Australia or a licensed financial adviser before making retirement decisions.
          </div>

          {/* 1 */}
          <div className="tos-section">
            <h2 className="tos-section-title">1. About Harbour</h2>
            <p className="tos-p">
              Harbour is an Australian web application that provides retirement forecasting tools for individuals. By accessing or using Harbour, you agree to be bound by these Terms of Service. If you do not agree, please do not use the service.
            </p>
            <p className="tos-p">
              References to "Harbour", "we", "us" or "our" refer to the operator of harbour.com.au. References to "you" or "your" refer to the person accessing or using Harbour.
            </p>
          </div>

          {/* 2 */}
          <div className="tos-section">
            <h2 className="tos-section-title">2. General information only — not financial advice</h2>
            <p className="tos-p">
              Harbour provides general information only. Nothing on Harbour constitutes financial advice, investment advice, retirement advice, or any other form of professional advice regulated under the <em>Corporations Act 2001</em> (Cth).
            </p>
            <p className="tos-p">
              Harbour is not the holder of an Australian Financial Services Licence (AFSL). The forecasts and projections generated by Harbour are based on modelled assumptions and historical data. They are not predictions, guarantees, or recommendations about your personal financial situation.
            </p>
            <div className="tos-highlight">
              Forecasts generated by Harbour are projections only. They should not be relied upon as the basis for any financial decision. Always seek advice from a licensed financial adviser before making retirement planning decisions.
            </div>
          </div>

          {/* 3 */}
          <div className="tos-section">
            <h2 className="tos-section-title">3. Accuracy of information</h2>
            <p className="tos-p">
              Harbour uses current Centrelink Age Pension rates, ATO superannuation rules, and ASFA retirement standards. These figures are updated periodically by the relevant government agencies and may change at any time. While we endeavour to keep Harbour's configuration current, we make no guarantee that the figures used in any forecast reflect the most recent rates at the time you use the service.
            </p>
            <p className="tos-p">
              Forecast results depend entirely on the inputs you provide. Harbour does not verify the accuracy of your inputs and is not responsible for results based on incorrect or incomplete information.
            </p>
            <p className="tos-p">
              The Monte Carlo simulation used by Harbour models a range of possible outcomes based on historical return assumptions. Past performance of investment markets does not guarantee future results. Actual outcomes may differ materially from any projection.
            </p>
          </div>

          {/* 4 */}
          <div className="tos-section">
            <h2 className="tos-section-title">4. Your account</h2>
            <p className="tos-p">
              To save forecasts, you must create an account using a valid email address and password. You are responsible for keeping your login credentials secure and for all activity that occurs under your account.
            </p>
            <p className="tos-p">
              You must not share your account with others or use another person's account without their permission. You must notify us immediately if you become aware of any unauthorised access to your account.
            </p>
            <p className="tos-p">
              We reserve the right to suspend or terminate your account if we reasonably believe you have breached these Terms, or if your account has been inactive for an extended period.
            </p>
          </div>

          {/* 5 */}
          <div className="tos-section">
            <h2 className="tos-section-title">5. Acceptable use</h2>
            <p className="tos-p">You agree not to use Harbour to:</p>
            <ul className="tos-list">
              <li>Provide false or misleading information</li>
              <li>Attempt to gain unauthorised access to Harbour's systems or another user's account</li>
              <li>Scrape, copy, or reproduce Harbour's content or forecasting output at scale</li>
              <li>Use Harbour in any way that violates applicable Australian or international law</li>
              <li>Resell or commercialise Harbour's output without our written permission</li>
            </ul>
          </div>

          {/* 6 */}
          <div className="tos-section">
            <h2 className="tos-section-title">6. Intellectual property</h2>
            <p className="tos-p">
              All content, code, design, and forecasting methodology on Harbour is owned by or licensed to us. You may not reproduce, distribute, or create derivative works from Harbour's content without our prior written consent.
            </p>
            <p className="tos-p">
              The forecasts generated from your personal inputs are yours. You may download, print, or share your own forecast results for personal use.
            </p>
          </div>

          {/* 7 */}
          <div className="tos-section">
            <h2 className="tos-section-title">7. Limitation of liability</h2>
            <p className="tos-p">
              To the maximum extent permitted by law, Harbour and its operators are not liable for any loss or damage arising from your use of the service, including but not limited to:
            </p>
            <ul className="tos-list">
              <li>Financial decisions made based on Harbour forecasts</li>
              <li>Inaccuracies in forecasts due to changes in government rates or legislation</li>
              <li>Loss of data or account access</li>
              <li>Service interruptions or technical errors</li>
              <li>Any indirect, consequential, or incidental loss</li>
            </ul>
            <p className="tos-p">
              Nothing in these Terms excludes or limits any rights you may have under the <em>Australian Consumer Law</em> that cannot be excluded or limited by agreement.
            </p>
          </div>

          {/* 8 */}
          <div className="tos-section">
            <h2 className="tos-section-title">8. Privacy</h2>
            <p className="tos-p">
              Your use of Harbour is also governed by our <a href="/privacy">Privacy Policy</a>, which explains how we collect, use, and protect your personal information. By using Harbour, you consent to the collection and use of your information as described in the Privacy Policy.
            </p>
          </div>

          {/* 9 */}
          <div className="tos-section">
            <h2 className="tos-section-title">9. Service availability</h2>
            <p className="tos-p">
              We aim to keep Harbour available at all times but do not guarantee uninterrupted access. We may suspend or discontinue the service at any time for maintenance, upgrades, or other reasons. We will endeavour to provide reasonable notice of planned outages where possible.
            </p>
          </div>

          {/* 10 */}
          <div className="tos-section">
            <h2 className="tos-section-title">10. Changes to these terms</h2>
            <p className="tos-p">
              We may update these Terms of Service from time to time. When we do, we will update the effective date at the top of this page. If we make material changes, we will notify you by email or by displaying a notice within the application. Continued use of Harbour after changes are posted constitutes your acceptance of the updated Terms.
            </p>
          </div>

          {/* 11 */}
          <div className="tos-section">
            <h2 className="tos-section-title">11. Governing law</h2>
            <p className="tos-p">
              These Terms are governed by the laws of Australia. Any disputes arising from your use of Harbour will be subject to the exclusive jurisdiction of the courts of Australia.
            </p>
          </div>

          {/* 12 */}
          <div className="tos-section">
            <h2 className="tos-section-title">12. Contact us</h2>
            <p className="tos-p">If you have any questions about these Terms of Service:</p>
            <div className="tos-contact-card">
              <p><strong style={{color:'#f5f0e8',fontWeight:500}}>Harbour</strong></p>
              <p>Email: <a href="mailto:legal@harbour.com.au">legal@harbour.com.au</a></p>
              <p>Website: <a href="https://harbour.com.au">harbour.com.au</a></p>
            </div>
          </div>

          <div className="tos-footer">
            These Terms of Service are written in plain English and governed by Australian law. Harbour is not a licensed financial services provider. If you have questions about your specific financial situation, we recommend seeking independent advice from a licensed financial adviser.
          </div>

        </main>
      </div>
    </>
  );
}
