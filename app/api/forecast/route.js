// app/api/forecast/route.js
// Authenticated POST endpoint — runs JS forecast engine, saves to Supabase, returns result.

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { runForecast } from '@/engine/forecast.js';

export async function POST(request) {
  // ── Auth: verify the user is signed in
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) { return cookieStore.get(name)?.value; },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // ── Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { name, current_age, super_balance, salary, annual_spending, retirement_age } = body;

  // Basic input validation
  if (!name || !current_age || super_balance == null || !annual_spending || !retirement_age) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // ── Pull config from Supabase
  const { data: configRows, error: configError } = await supabase
    .from('config')
    .select('key, value');

  if (configError || !configRows?.length) {
    return Response.json({ error: 'Failed to load config' }, { status: 500 });
  }

  // Convert config rows array → flat object { key: value }
  const config = {};
  for (const row of configRows) {
    config[row.key] = Number(row.value);
  }

  // ── Run the forecast engine (pure JS — no Python, no child_process)
  let outputs;
  try {
    outputs = runForecast(
      {
        current_age:     Number(current_age),
        super_balance:   Number(super_balance),
        salary:          Number(salary) || 0,
        annual_spending: Number(annual_spending),
        retirement_age:  Number(retirement_age),
      },
      config
    );
  } catch (err) {
    console.error('Forecast engine error:', err);
    return Response.json({ error: 'Forecast calculation failed' }, { status: 500 });
  }

  // ── Save forecast to Supabase
  const { data: saved, error: saveError } = await supabase
    .from('forecasts')
    .insert({
      user_id:        user.id,
      name,
      inputs: {
        current_age:     Number(current_age),
        super_balance:   Number(super_balance),
        salary:          Number(salary) || 0,
        annual_spending: Number(annual_spending),
        retirement_age:  Number(retirement_age),
      },
      outputs,
      config_version: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (saveError || !saved) {
    console.error('Supabase save error:', saveError);
    return Response.json({ error: 'Failed to save forecast' }, { status: 500 });
  }

  // ── Return the forecast ID and all outputs to the client
  return Response.json({ id: saved.id, ...outputs });
}
