import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    // ── Check user is authenticated and is admin ──────────────────────────
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
    }

    // Admin email check
    const adminEmail = process.env.ADMIN_EMAIL
    if (adminEmail && user.email !== adminEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // ── Parse body ────────────────────────────────────────────────────────
    const { key, value } = await request.json()

    if (!key || value === undefined || value === null) {
      return NextResponse.json({ error: 'Missing key or value' }, { status: 400 })
    }

    // ── Update using service role key (bypasses RLS) ──────────────────────
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const today = new Date().toISOString().split('T')[0]

    const { error } = await adminSupabase
      .from('config')
      .update({
        value: value,
        last_updated: today,
      })
      .eq('key', key)

    if (error) {
      console.error('Config update error:', error)
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
    }

    return NextResponse.json({ success: true, key, value })

  } catch (err) {
    console.error('Admin config error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
