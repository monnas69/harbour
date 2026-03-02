import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export async function POST(request) {
  try {
    // ── GET USER
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

    // ── GET INPUTS
    const inputs = await request.json()

    // ── GET CONFIG FROM DATABASE
    const { data: configRows, error: configError } = await supabase
      .from('config')
      .select('key, value')

    if (configError) {
      return NextResponse.json({ error: 'Could not load config' }, { status: 500 })
    }

    const config = {}
    configRows.forEach(row => { config[row.key] = row.value })

    // ── RUN PYTHON ENGINE
    const enginePath = path.join(process.cwd(), 'engine', 'forecast.py')
    const result = await runPython(enginePath, inputs, config)

    // ── SAVE FORECAST TO DATABASE
    const { data: saved, error: saveError } = await supabase
  .from('forecasts')
  .insert({
    user_id: user.id,
    name: `${inputs.name}'s forecast`,
    inputs: inputs,
    outputs: result,
    config_version: new Date().toISOString(),
  })
  .select('id')
  .single()

if (saveError) {
  console.error('Save error:', saveError)
  return NextResponse.json({ error: 'Could not save forecast' }, { status: 500 })
}

return NextResponse.json({ id: saved.id, ...result })

  } catch (err) {
    console.error('Forecast error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

function runPython(enginePath, inputs, config) {
  return new Promise((resolve, reject) => {
    const py = spawn('py', [
      enginePath,
      JSON.stringify(inputs),
      JSON.stringify(config)
    ])

    let output = ''
    let errorOutput = ''

    py.stdout.on('data', data => { output += data.toString() })
    py.stderr.on('data', data => { errorOutput += data.toString() })

    py.on('close', code => {
      if (code !== 0) {
        reject(new Error(errorOutput || 'Python process failed'))
        return
      }
      try {
        resolve(JSON.parse(output))
      } catch {
        reject(new Error('Invalid JSON from Python: ' + output))
      }
    })
  })
}