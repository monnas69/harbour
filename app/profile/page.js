'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [isPlus, setIsPlus] = useState(false)

  // Display name
  const [displayName, setDisplayName] = useState('')
  const [nameStatus, setNameStatus] = useState(null) // { type: 'success'|'error', message }
  const [nameSaving, setNameSaving] = useState(false)

  // Email
  const [email, setEmail] = useState('')
  const [emailStatus, setEmailStatus] = useState(null)
  const [emailSaving, setEmailSaving] = useState(false)

  // Password
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordStatus, setPasswordStatus] = useState(null)
  const [passwordSaving, setPasswordSaving] = useState(false)

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
      setEmail(user.email || '')
      setDisplayName(user.user_metadata?.display_name || '')

      // Load plan status
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_plus')
        .eq('id', user.id)
        .single()
      setIsPlus(profile?.is_plus === true)

      setLoading(false)
    }
    loadUser()
  }, [])

  async function handleSaveName(e) {
    e.preventDefault()
    setNameSaving(true)
    setNameStatus(null)
    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName.trim() }
    })
    setNameSaving(false)
    if (error) {
      setNameStatus({ type: 'error', message: error.message })
    } else {
      setNameStatus({ type: 'success', message: 'Name updated.' })
    }
  }

  async function handleSaveEmail(e) {
    e.preventDefault()
    setEmailSaving(true)
    setEmailStatus(null)
    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes('@')) {
      setEmailStatus({ type: 'error', message: 'Please enter a valid email address.' })
      setEmailSaving(false)
      return
    }
    const { error } = await supabase.auth.updateUser({ email: trimmed })
    setEmailSaving(false)
    if (error) {
      setEmailStatus({ type: 'error', message: error.message })
    } else {
      setEmailStatus({
        type: 'success',
        message: 'Confirmation sent to your new address. Click the link to complete the change.'
      })
    }
  }

  async function handleSavePassword(e) {
    e.preventDefault()
    setPasswordStatus(null)
    if (newPassword.length < 8) {
      setPasswordStatus({ type: 'error', message: 'Password must be at least 8 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'Passwords do not match.' })
      return
    }
    setPasswordSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordSaving(false)
    if (error) {
      setPasswordStatus({ type: 'error', message: error.message })
    } else {
      setPasswordStatus({ type: 'success', message: 'Password updated successfully.' })
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  // ─── Styles ──────────────────────────────────────────────────────────────
  const NAVY  = '#0D1F35'
  const GOLD  = '#C9A84C'
  const CREAM = '#F5F0E8'
  const LIGHT_NAVY = '#1a3352'

  const styles = {
    page: {
      minHeight: '100vh',
      backgroundColor: CREAM,
      fontFamily: "'DM Sans', sans-serif",
      color: NAVY,
    },
    header: {
      backgroundColor: NAVY,
      padding: '16px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    wordmark: {
      fontFamily: "'Playfair Display', Georgia, serif",
      color: GOLD,
      fontSize: '22px',
      fontWeight: 700,
      letterSpacing: '0.04em',
      textDecoration: 'none',
    },
    backLink: {
      color: CREAM,
      fontSize: '14px',
      textDecoration: 'none',
      opacity: 0.8,
      cursor: 'pointer',
    },
    main: {
      maxWidth: '560px',
      margin: '0 auto',
      padding: '40px 20px 80px',
    },
    pageTitle: {
      fontFamily: "'Playfair Display', Georgia, serif",
      fontSize: '28px',
      fontWeight: 700,
      color: NAVY,
      marginBottom: '8px',
    },
    pageSubtitle: {
      fontSize: '15px',
      color: '#4a5568',
      marginBottom: '40px',
    },
    card: {
      backgroundColor: '#fff',
      border: `1px solid #ddd`,
      borderRadius: '10px',
      padding: '28px',
      marginBottom: '24px',
    },
    cardTitle: {
      fontFamily: "'Playfair Display', Georgia, serif",
      fontSize: '18px',
      fontWeight: 700,
      color: NAVY,
      marginBottom: '4px',
    },
    cardSubtitle: {
      fontSize: '13px',
      color: '#718096',
      marginBottom: '20px',
    },
    divider: {
      borderTop: '1px solid #e8e8e8',
      margin: '20px 0',
    },
    label: {
      display: 'block',
      fontSize: '13px',
      fontWeight: 600,
      color: NAVY,
      marginBottom: '6px',
    },
    input: {
      width: '100%',
      padding: '11px 14px',
      fontSize: '15px',
      border: '1.5px solid #ccc',
      borderRadius: '7px',
      backgroundColor: '#fff',
      color: NAVY,
      boxSizing: 'border-box',
      outline: 'none',
      fontFamily: "'DM Sans', sans-serif",
    },
    inputGroup: {
      marginBottom: '16px',
    },
    btn: {
      backgroundColor: GOLD,
      color: NAVY,
      border: 'none',
      borderRadius: '7px',
      padding: '11px 24px',
      fontSize: '14px',
      fontWeight: 700,
      cursor: 'pointer',
      letterSpacing: '0.02em',
    },
    btnDisabled: {
      opacity: 0.6,
      cursor: 'not-allowed',
    },
    statusSuccess: {
      marginTop: '12px',
      padding: '10px 14px',
      backgroundColor: '#f0fdf4',
      border: '1px solid #86efac',
      borderRadius: '6px',
      fontSize: '13px',
      color: '#166534',
    },
    statusError: {
      marginTop: '12px',
      padding: '10px 14px',
      backgroundColor: '#fef2f2',
      border: '1px solid #fca5a5',
      borderRadius: '6px',
      fontSize: '13px',
      color: '#991b1b',
    },
    emailHint: {
      fontSize: '12px',
      color: '#718096',
      marginTop: '5px',
    },
    planRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 0',
      borderTop: '1px solid #e8e8e8',
    },
    planLabel: {
      fontSize: '14px',
      color: '#4a5568',
    },
    planBadgeFree: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      background: 'rgba(201,168,76,0.1)',
      border: '1px solid rgba(201,168,76,0.35)',
      color: '#9a7a28',
      fontSize: '12px',
      padding: '4px 10px',
      borderRadius: '20px',
      fontWeight: 600,
    },
    planBadgePlus: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      background: 'rgba(201,168,76,0.15)',
      border: '1px solid rgba(201,168,76,0.5)',
      color: '#7a5c10',
      fontSize: '12px',
      padding: '4px 10px',
      borderRadius: '20px',
      fontWeight: 600,
    },
  }

  if (loading) {
    return (
      <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: NAVY, opacity: 0.5 }}>Loading…</p>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <a href="/" style={styles.wordmark}>HARBOUR</a>
        <a href="/dashboard" style={styles.backLink}>← Back to dashboard</a>
      </div>

      <div style={styles.main}>
        <h1 style={styles.pageTitle}>Your profile</h1>
        <p style={styles.pageSubtitle}>
          Update your account details below. Email changes require confirmation via your new address.
        </p>

        {/* ── Display name ── */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>Display name</div>
          <div style={styles.cardSubtitle}>
            Used to personalise your dashboard greeting.
          </div>
          <form onSubmit={handleSaveName}>
            <div style={styles.inputGroup}>
              <label style={styles.label} htmlFor="displayName">Name</label>
              <input
                id="displayName"
                style={styles.input}
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="e.g. Karen"
                maxLength={60}
                autoComplete="name"
              />
            </div>
            <button
              type="submit"
              style={{ ...styles.btn, ...(nameSaving ? styles.btnDisabled : {}) }}
              disabled={nameSaving}
            >
              {nameSaving ? 'Saving…' : 'Save name'}
            </button>
            {nameStatus && (
              <div style={nameStatus.type === 'success' ? styles.statusSuccess : styles.statusError}>
                {nameStatus.message}
              </div>
            )}
          </form>
        </div>

        {/* ── Email ── */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>Email address</div>
          <div style={styles.cardSubtitle}>
            Your current email: <strong>{user.email}</strong>
          </div>
          <form onSubmit={handleSaveEmail}>
            <div style={styles.inputGroup}>
              <label style={styles.label} htmlFor="email">New email address</label>
              <input
                id="email"
                style={styles.input}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="new@example.com"
                autoComplete="email"
              />
              <p style={styles.emailHint}>
                A confirmation link will be sent to your new address. Your email won't change until you click it.
              </p>
            </div>
            <button
              type="submit"
              style={{ ...styles.btn, ...(emailSaving ? styles.btnDisabled : {}) }}
              disabled={emailSaving}
            >
              {emailSaving ? 'Sending…' : 'Update email'}
            </button>
            {emailStatus && (
              <div style={emailStatus.type === 'success' ? styles.statusSuccess : styles.statusError}>
                {emailStatus.message}
              </div>
            )}
          </form>
        </div>

        {/* ── Password ── */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>Change password</div>
          <div style={styles.cardSubtitle}>
            Choose a new password of at least 8 characters.
          </div>
          <form onSubmit={handleSavePassword}>
            <div style={styles.inputGroup}>
              <label style={styles.label} htmlFor="newPassword">New password</label>
              <input
                id="newPassword"
                style={styles.input}
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label} htmlFor="confirmPassword">Confirm new password</label>
              <input
                id="confirmPassword"
                style={styles.input}
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              style={{ ...styles.btn, ...(passwordSaving ? styles.btnDisabled : {}) }}
              disabled={passwordSaving}
            >
              {passwordSaving ? 'Updating…' : 'Update password'}
            </button>
            {passwordStatus && (
              <div style={passwordStatus.type === 'success' ? styles.statusSuccess : styles.statusError}>
                {passwordStatus.message}
              </div>
            )}
          </form>
        </div>

        {/* ── Plan ── */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>Plan</div>
          <div style={styles.cardSubtitle}>
            Your current Harbour subscription.
          </div>
          <div style={styles.planRow}>
            <span style={styles.planLabel}>Current plan</span>
            <span style={isPlus ? styles.planBadgePlus : styles.planBadgeFree}>
              ✦ {isPlus ? 'Harbour Plus' : 'Free'}
            </span>
          </div>
          {!isPlus && (
            <div style={{ marginTop: 16 }}>
              <a href="/upgrade" style={styles.btn}>
                See Harbour Plus →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
