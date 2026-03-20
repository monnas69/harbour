// app/api/forecast/safe-spending/route.js
// POST endpoint — reverse forecast ("How much can I safely spend?").
// Accepts the same demographic inputs as /api/forecast but instead of
// annual_spending it takes target_horizon (default 90) and returns:
//   safe_spending_conservative  — 90 % probability of lasting to target
//   safe_spending_balanced      — 50 % probability of lasting to target
//   safe_spending_aggressive    — 10 % probability of lasting to target
// Plus the full Monte Carlo curves at the balanced spending level.
//
// Auth behaviour mirrors /api/forecast:
//   authenticated   → saves to forecasts table, returns { id, ...outputs }
//   unauthenticated → returns outputs only (no save, no id)
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { runSafeSpending } from '../../../../engine/forecast.js';

export async function POST(request) {
  // ── Parse body
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
    retirement_age,
    target_horizon,
  } = body;

  if (!name || !current_age || super_balance == null || !retirement_age) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const horizon = Number(target_horizon) || 90;
  if (horizon < 70 || horizon > 100) {
    return Response.json({ error: 'target_horizon must be between 70 and 100' }, { status: 400 });
  }

  // ── Auth (optional)
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

  // ── Pull config
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

  // ── Run reverse forecast
  const inputs = {
    current_age:      Number(current_age),
    super_balance:    Number(super_balance),
    salary:           Number(salary) || 0,
    salary_sacrifice: Number(salary_sacrifice) || 0,
    ncc:              Number(ncc) || 0,
    retirement_age:   Number(retirement_age),
    // annual_spending is not user-provided — the engine solves for it
    annual_spending:  0,
  };

  let outputs;
  try {
    outputs = runSafeSpending(inputs, config, horizon);
  } catch (err) {
    console.error('Safe spending engine error:', err);
    return Response.json({ error: 'Safe spending calculation failed' }, { status: 500 });
  }

  // ── Save if authenticated
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_plus')
      .eq('id', user.id)
      .single();

    const isPlus = profile?.is_plus === true;

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

    const savedInputs = { ...inputs, mode: 'safe_spending', target_horizon: horizon };
    const { data: saved, error: saveError } = await supabase
      .from('forecasts')
      .insert({
        user_id: user.id,
        name,
        inputs: savedInputs,
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

  // ── Unauthenticated — return outputs only
  return Response.json(outputs);
}

// PUT — update an existing safe-spending forecast (re-run). No limit check.
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
    retirement_age,
    target_horizon,
  } = body;

  if (!forecast_id || !name || !current_age || super_balance == null || !retirement_age) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const horizon = Number(target_horizon) || 90;
  if (horizon < 70 || horizon > 100) {
    return Response.json({ error: 'target_horizon must be between 70 and 100' }, { status: 400 });
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
    retirement_age:   Number(retirement_age),
    annual_spending:  0,
  };

  let outputs;
  try {
    outputs = runSafeSpending(inputs, config, horizon);
  } catch (err) {
    console.error('Safe spending engine error:', err);
    return Response.json({ error: 'Safe spending calculation failed' }, { status: 500 });
  }

  const savedInputs = { ...inputs, mode: 'safe_spending', target_horizon: horizon };
  const { error: updateError } = await supabase
    .from('forecasts')
    .update({ name, inputs: savedInputs, outputs, config_version: new Date().toISOString() })
    .eq('id', forecast_id)
    .eq('user_id', user.id);

  if (updateError) {
    console.error('Supabase update error:', updateError);
    return Response.json({ error: 'Failed to update forecast' }, { status: 500 });
  }

  return Response.json({ id: forecast_id, ...outputs });
}
