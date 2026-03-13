import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code       = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type       = searchParams.get('type')
  const next       = searchParams.get('next') ?? '/auth/reset'

  // ── Password reset flow (code param) ─────────────────────────────────────
  if (code) {
    return NextResponse.redirect(`${origin}${next}?code=${code}`)
  }

  // ── Email confirmation flow (token_hash param) ────────────────────────────
  if (token_hash && type === 'email') {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) { return cookieStore.get(name)?.value },
          set(name, value, options) { cookieStore.set({ name, value, ...options }) },
          remove(name, options) { cookieStore.set({ name, value: '', ...options }) },
        },
      }
    )

    const { error } = await supabase.auth.verifyOtp({ token_hash, type })

    if (!error) {
      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  return NextResponse.redirect(`${origin}/auth/login?error=confirmation_failed`)
}
