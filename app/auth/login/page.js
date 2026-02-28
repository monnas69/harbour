'use client'
import { useState } from 'react'
import { createClient } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      router.push('/dashboard')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      router.push('/dashboard')
    }
  }

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 400, margin: '80px auto', padding: '0 24px' }}>
      <h1 style={{ marginBottom: 8 }}>Harbour</h1>
      <h2 style={{ fontWeight: 400, marginBottom: 32 }}>{isSignUp ? 'Create account' : 'Sign in'}</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>Email</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            required style={{ width: '100%', padding: '10px 12px', fontSize: 15, boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>Password</label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            required style={{ width: '100%', padding: '10px 12px', fontSize: 15, boxSizing: 'border-box' }}
          />
        </div>

        {error && <p style={{ color: 'red', marginBottom: 16, fontSize: 13 }}>{error}</p>}

        <button type="submit" disabled={loading}
          style={{ width: '100%', padding: '12px', background: '#0d1f35', color: 'white',
            border: 'none', fontSize: 15, cursor: 'pointer', marginBottom: 16 }}>
          {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
        </button>
      </form>

      <p style={{ fontSize: 13, textAlign: 'center' }}>
        {isSignUp ? 'Already have an account? ' : 'New to Harbour? '}
        <a href="#" onClick={() => setIsSignUp(!isSignUp)} style={{ color: '#c9a84c' }}>
          {isSignUp ? 'Sign in' : 'Create free account'}
        </a>
      </p>
    </main>
  )
}