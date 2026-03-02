import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const { data, error } = await supabase
      .from('config')
      .select('key')
      .limit(1)

    if (error) throw error

    console.log('[keep-alive] Supabase ping successful:', new Date().toISOString())

    return Response.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Supabase keep-alive ping successful'
    })

  } catch (err) {
    console.error('[keep-alive] Supabase ping failed:', err.message)

    return Response.json(
      { status: 'error', message: err.message },
      { status: 500 }
    )
  }
}