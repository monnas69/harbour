// app/api/forecast/route.js
// POST endpoint — runs JS forecast engine.
// Authenticated: saves to Supabase and returns { id, ...outputs }
// Unauthenticated: runs engine and returns outputs only (no save, no id)
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { runForecast } from '../../../engine/forecast.js';

export async function POST(request) {
  // ── Parse request body
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const {
    name,
    current_age,
    super_balance,
    salary,
    salary_sacrifice,
    ncc,
    annual_spending,
    retirement_age,
  } = body;

  if (!name || !current_age || super_balance == null || !annual_spending || !retirement_age) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // ── Check for session (optional — unauthenticated users can still run forecasts)
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

  const { data: { user } } = await supabase.auth.getUser();

  // ── Pull config from Supabase (public readable — no auth required)
  const { data: configRows, error: configError } = await supabase
    .from('config')
    .select('key, value');

  if (configError || !configRows?.length) {
    return Response.json({ error: 'Failed to load config' }, { status: 500 });
  }

  const config = {};
  for (const row of configRows) {
    config[row.key] = Number(row.value);
  }

  // ── Run the forecast engine
  const inputs = {
    current_age:      Number(current_age),
    super_balance:    Number(super_balance),
    salary:           Number(salary) || 0,
    salary_sacrifice: Number(salary_sacrifice) || 0,
    ncc:              Number(ncc) || 0,
    annual_spending:  Number(annual_spending),
    retirement_age:   Number(retirement_age),
  };

  let outputs;
  try {
    outputs = runForecast(inputs, config);
  } catch (err) {
    console.error('Forecast engine error:', err);
    return Response.json({ error: 'Forecast calculation failed' }, { status: 500 });
  }

  // ── If user is authenticated, save to Supabase and return the forecast id
  if (user) {
    // Check if user is on Plus plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_plus')
      .eq('id', user.id)
      .single();

    const isPlus = profile?.is_plus === true;

    // Check forecast limit (free tier = 3 max; Plus = unlimited)
    if (!isPlus) {
      const { count, error: countError } = await supabase
        .from('forecasts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) {
        console.error('Forecast count error:', countError);
        return Response.json({ error: 'Failed to check forecast limit' }, { status: 500 });
      }

      if (count >= 3) {
        return Response.json(
          { error: 'FORECAST_LIMIT_REACHED', message: 'Free accounts are limited to 3 saved forecasts. Upgrade to Harbour Plus for unlimited forecasts, or delete an existing forecast to save a new one.' },
          { status: 403 }
        );
      }
    }

    const { data: saved, error: saveError } = await supabase
      .from('forecasts')
      .insert({
        user_id: user.id,
        name,
        inputs,
        outputs,
        config_version: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (saveError || !saved) {
      console.error('Supabase save error:', saveError);
      return Response.json({ error: 'Failed to save forecast' }, { status: 500 });
    }

    return Response.json({ id: saved.id, ...outputs });
  }

  // ── Unauthenticated — return outputs only (no id, no save)
  return Response.json(outputs);
}

// PUT — update an existing forecast (re-run). No limit check.
export async function PUT(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const {
    forecast_id,
    name,
    current_age,
    super_balance,
    salary,
    salary_sacrifice,
    ncc,
    annual_spending,
    retirement_age,
  } = body;

  if (!forecast_id || !name || !current_age || super_balance == null || !annual_spending || !retirement_age) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { get(name) { return cookieStore.get(name)?.value; } } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: configRows, error: configError } = await supabase.from('config').select('key, value');
  if (configError || !configRows?.length) {
    return Response.json({ error: 'Failed to load config' }, { status: 500 });
  }
  const config = {};
  for (const row of configRows) config[row.key] = Number(row.value);

  const inputs = {
    current_age:      Number(current_age),
    super_balance:    Number(super_balance),
    salary:           Number(salary) || 0,
    salary_sacrifice: Number(salary_sacrifice) || 0,
    ncc:              Number(ncc) || 0,
    annual_spending:  Number(annual_spending),
    retirement_age:   Number(retirement_age),
  };

  let outputs;
  try {
    outputs = runForecast(inputs, config);
  } catch (err) {
    console.error('Forecast engine error:', err);
    return Response.json({ error: 'Forecast calculation failed' }, { status: 500 });
  }

  const { error: updateError } = await supabase
    .from('forecasts')
    .update({ name, inputs, outputs, config_version: new Date().toISOString() })
    .eq('id', forecast_id)
    .eq('user_id', user.id);

  if (updateError) {
    console.error('Supabase update error:', updateError);
    return Response.json({ error: 'Failed to update forecast' }, { status: 500 });
  }

  return Response.json({ id: forecast_id, ...outputs });
}