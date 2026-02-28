import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
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
  if (!user) redirect('/auth/login')

  const { data: forecasts } = await supabase
    .from('forecasts')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
        <h1 style={{ fontFamily: 'Georgia', fontSize: 28 }}>Harbour</h1>
        <span style={{ fontSize: 13, color: '#8a9bb0' }}>{user.email}</span>
      </div>

      <h2 style={{ fontFamily: 'Georgia', fontWeight: 400, marginBottom: 24 }}>My forecasts</h2>

      {forecasts && forecasts.length > 0 ? (
        <div>
          {forecasts.map(f => (
            <div key={f.id} style={{ border: '1px solid #ddd', borderRadius: 6,
              padding: '20px 24px', marginBottom: 12 }}>
              <div style={{ fontWeight: 500 }}>{f.name}</div>
              <div style={{ fontSize: 13, color: '#8a9bb0', marginTop: 4 }}>
                Saved {new Date(f.created_at).toLocaleDateString('en-AU')}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ border: '1px dashed #ddd', borderRadius: 6, padding: '40px 24px',
          textAlign: 'center', color: '#8a9bb0' }}>
          <p>No saved forecasts yet.</p>
          <a href="/forecast" style={{ color: '#c9a84c', fontSize: 14 }}>Run your first forecast →</a>
        </div>
      )}
    </main>
  )
}