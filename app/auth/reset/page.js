'use client'
import { useState, useEffect } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [error, setError]         = useState(null)
  const [loading, setLoading]     = useState(false)
  const [done, setDone]           = useState(false)
  const [ready, setReady]         = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  // Supabase puts the session tokens in the URL hash when the user
  // clicks the reset link — we need to wait for the auth state to
  // update before allowing the form to submit.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setDone(true)
    setLoading(false)
    setTimeout(() => router.push('/dashboard'), 2500)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap');

        .login-body {
          font-family: 'DM Sans', sans-serif;
          background: #0d1f35;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          color: #f5f0e8;
          position: relative;
        }

        .login-body::before {
          content: '';
          position: fixed; inset: 0;
          background-image:
            linear-gradient(rgba(201,168,76,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(201,168,76,0.025) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
          z-index: 0;
        }

        .login-nav {
          display: flex;
          align-items: center;
          padding: 24px 40px;
          border-bottom: 1px solid rgba(201,168,76,0.1);
          position: relative;
          z-index: 10;
        }

        .login-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
        }

        .login-logo-text {
          font-family: 'Playfair Display', serif;
          font-size: 20px;
          font-weight: 600;
          color: #f5f0e8;
          letter-spacing: 0.04em;
        }

        .login-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          position: relative;
          z-index: 1;
        }

        .login-card {
          width: 100%;
          max-width: 460px;
          background: rgba(20,41,68,0.7);
          border: 1px solid rgba(201,168,76,0.15);
          border-radius: 8px;
          padding: 48px 48px 40px;
          backdrop-filter: blur(20px);
          box-shadow: 0 40px 80px rgba(0,0,0,0.3);
          position: relative;
          overflow: hidden;
        }

        .login-card::before {
          content: '';
          position: absolute;
          top: 0; left: 48px; right: 48px;
          height: 2px;
          background: #c9a84c;
          opacity: 0.6;
        }

        .login-heading {
          font-family: 'Playfair Display', serif;
          font-size: 28px;
          font-weight: 600;
          color: #f5f0e8;
          margin-bottom: 6px;
          line-height: 1.2;
        }

        .login-subheading {
          font-size: 14px;
          color: #8a9bb0;
          font-weight: 300;
          margin-bottom: 36px;
        }

        .login-label {
          display: block;
          font-size: 12px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #8a9bb0;
          font-weight: 500;
          margin-bottom: 8px;
        }

        .login-input {
          width: 100%;
          background: rgba(13,31,53,0.8);
          border: 1px solid rgba(201,168,76,0.25);
          border-radius: 4px;
          color: #f5f0e8;
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          font-weight: 300;
          padding: 14px 16px;
          outline: none;
          transition: all 0.2s;
          box-sizing: border-box;
        }

        .login-input:focus {
          border-color: #c9a84c;
          background: rgba(13,31,53,1);
          box-shadow: 0 0 0 3px rgba(201,168,76,0.1);
        }

        .login-input::placeholder { color: rgba(138,155,176,0.4); }

        .login-field { margin-bottom: 20px; }

        .login-error {
          background: rgba(192,97,74,0.1);
          border: 1px solid rgba(192,97,74,0.3);
          border-radius: 4px;
          color: #e08878;
          font-size: 13px;
          padding: 10px 14px;
          margin-bottom: 20px;
          line-height: 1.5;
        }

        .login-success {
          background: rgba(76,168,100,0.1);
          border: 1px solid rgba(76,168,100,0.3);
          border-radius: 4px;
          color: #7ecf94;
          font-size: 14px;
          padding: 16px 18px;
          line-height: 1.6;
        }

        .login-btn {
          width: 100%;
          background: #c9a84c;
          border: none;
          border-radius: 3px;
          color: #0d1f35;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 500;
          padding: 15px;
          cursor: pointer;
          letter-spacing: 0.03em;
          transition: all 0.2s;
          margin-top: 8px;
        }

        .login-btn:hover:not(:disabled) {
          background: #e8cc88;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(201,168,76,0.3);
        }

        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .login-waiting {
          font-size: 14px;
          color: #8a9bb0;
          text-align: center;
          padding: 16px 0;
          line-height: 1.6;
        }
      `}</style>

      <div className="login-body">
        <nav className="login-nav">
          <a href="/" className="login-logo">
            <svg viewBox="0 0 36 36" fill="none" width="28" height="28">
              <circle cx="18" cy="18" r="17" stroke="#c9a84c" strokeWidth="1"/>
              <line x1="18" y1="7" x2="18" y2="29" stroke="#c9a84c" strokeWidth="1.5"/>
              <line x1="11" y1="14" x2="25" y2="14" stroke="#c9a84c" strokeWidth="1.5"/>
              <path d="M11 29 Q18 24 25 29" stroke="#c9a84c" strokeWidth="1.5" fill="none"/>
            </svg>
            <span className="login-logo-text">Harbour</span>
          </a>
        </nav>

        <main className="login-main">
          <div className="login-card">

            {done ? (
              <>
                <h1 className="login-heading">Password updated</h1>
                <p className="login-subheading">You're all set</p>
                <div className="login-success">
                  Your password has been changed. Redirecting you to your dashboard…
                </div>
              </>
            ) : !ready ? (
              <>
                <h1 className="login-heading">Set new password</h1>
                <p className="login-subheading">Verifying your reset link…</p>
                <p className="login-waiting">Please wait a moment while we verify your link. If nothing happens, try clicking the link in your email again.</p>
              </>
            ) : (
              <>
                <h1 className="login-heading">Set new password</h1>
                <p className="login-subheading">Choose a new password for your account</p>
                <form onSubmit={handleSubmit}>
                  <div className="login-field">
                    <label className="login-label">New password</label>
                    <input className="login-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" required />
                  </div>
                  <div className="login-field">
                    <label className="login-label">Confirm new password</label>
                    <input className="login-input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required />
                  </div>
                  {error && <div className="login-error">{error}</div>}
                  <button className="login-btn" type="submit" disabled={loading}>{loading ? 'Updating…' : 'Update password'}</button>
                </form>
              </>
            )}

          </div>
        </main>
      </div>
    </>
  )
}
