// engine/forecast.js
// JavaScript port of engine/forecast.py — no external dependencies required.

// ── Seeded PRNG (mulberry32)
// Produces deterministic results for the same inputs (seed = 42)
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller transform: two uniform randoms → one standard normal
function randomNormal(rand, mean, std) {
  const u1 = Math.max(1e-10, rand());
  const u2 = rand();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * std;
}

// Percentile with linear interpolation — matches numpy's default behaviour
function percentile(arr, p) {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
}

// ── Centrelink Age Pension calculation
function calculatePension(
  bal,
  pensionMax,
  assetsLower,
  assetsUpper,
  taper,
  incomeFree,
  deemingLow,
  deemingThr,
  deemingHigh
) {
  if (bal >= assetsUpper) return 0;
  const fnPerYear = 26;

  // Assets test
  const assetsReduction = Math.max(0, Math.floor((bal - assetsLower) / 1000)) * taper;
  const pensionAssets = Math.max(0, pensionMax - assetsReduction);

  // Income test
  let deemedAnnual;
  if (bal <= deemingThr) {
    deemedAnnual = bal * deemingLow;
  } else {
    deemedAnnual = deemingThr * deemingLow + (bal - deemingThr) * deemingHigh;
  }
  const deemedFn = deemedAnnual / fnPerYear;
  const incomeReduction = Math.max(0, (deemedFn - incomeFree) * 0.5);
  const pensionIncome = Math.max(0, pensionMax - incomeReduction);

  // Lower of the two tests applies
  return Math.min(pensionAssets, pensionIncome);
}

// ── Main forecast function
function runForecast(inputs, config) {
  // ── Inputs
  const age            = inputs.current_age;
  const superBal       = inputs.super_balance;
  const salary         = inputs.salary || 0;
  const salarySacrifice = inputs.salary_sacrifice || 0;  // annual, pre-tax
  const ncc            = inputs.ncc || 0;                // annual, after-tax
  const spending       = inputs.annual_spending;
  const retireAge      = inputs.retirement_age;
  const runs           = 1000;

  // ── Config
  const retAcc     = config.return_accumulation / 100;
  const retRet     = config.return_retirement   / 100;
  const volatility = config.return_volatility   / 100;
  const inflation  = config.inflation_rate      / 100;
  const sgRate     = config.sg_rate             / 100;

  const pensionMax  =
    config.pension_base_single +
    config.pension_supplement_single +
    config.pension_energy_single;
  const assetsLower = config.assets_lower_single_owner;
  const assetsUpper = config.assets_upper_single_owner;
  const taper       = config.assets_taper_rate;
  const incomeFree  = config.income_free_area_single;
  const deemingLow  = config.deeming_rate_lower  / 100;
  const deemingThr  = config.deeming_threshold_single;
  const deemingHigh = config.deeming_rate_upper  / 100;

  const pensionAge = 67;
  const longevity  = 90;
  const accYears   = Math.max(retireAge - age, 1);
  const retYears   = Math.max(longevity - retireAge, 1);
  const totalYears = accYears + retYears;

  const fnPerYear = 26;

  // ── Concessional contributions (SG + salary sacrifice), taxed at 15% on entry
  // The 0.85 multiplier reflects the 15% contributions tax applied to all
  // concessional (pre-tax) money entering the fund.
  const sgFortnightly          = (salary * sgRate) / fnPerYear;
  const salarySacrificeFortnightly = salarySacrifice / fnPerYear;
  const concFortnightlyAfterTax =
    (sgFortnightly + salarySacrificeFortnightly) * 0.85;

  // ── Non-concessional contributions (after-tax) — no tax on entry
  const nccFortnightly = ncc / fnPerYear;

  // Total fortnightly contribution into super
  const totalContribFortnightly = concFortnightlyAfterTax + nccFortnightly;

  // ── Seeded PRNG — seed 42 for reproducible results
  const rand = mulberry32(42);

  // Pre-generate all return arrays
  const accReturns = [];
  for (let i = 0; i < runs; i++) {
    const row = [];
    for (let y = 0; y < accYears; y++) {
      row.push(randomNormal(rand, retAcc, volatility));
    }
    accReturns.push(row);
  }

  const retReturns = [];
  for (let i = 0; i < runs; i++) {
    const row = [];
    for (let y = 0; y < retYears; y++) {
      row.push(randomNormal(rand, retRet, volatility * 0.8));
    }
    retReturns.push(row);
  }

  // ── Monte Carlo simulation
  const allBalances = Array.from({ length: totalYears }, () =>
    new Array(runs).fill(0)
  );
  const fundsLastAges = [];

  for (let i = 0; i < runs; i++) {
    let bal = superBal;

    // Accumulation phase
    for (let y = 0; y < accYears; y++) {
      const r = accReturns[i][y];
      // Investment earnings taxed at 15%; contributions already taxed on entry above
      bal = bal + bal * r * 0.85 + totalContribFortnightly * fnPerYear;
      allBalances[y][i] = bal;
    }

    // Retirement phase
    let fundsLast = longevity;
    for (let y = 0; y < retYears; y++) {
      const currentAgeYr = retireAge + y;
      const r = retReturns[i][y];

      let pensionFn = 0;
      if (currentAgeYr >= pensionAge) {
        pensionFn = calculatePension(
          bal, pensionMax, assetsLower, assetsUpper, taper,
          incomeFree, deemingLow, deemingThr, deemingHigh
        );
      }

      const pensionAnnual = pensionFn * fnPerYear;
      const realSpending  = spending * Math.pow(1 + inflation, y);
      const net = bal * (1 + r) + pensionAnnual - realSpending;
      bal = Math.max(0, net);

      allBalances[accYears + y][i] = bal;

      if (bal === 0 && fundsLast === longevity) {
        fundsLast = currentAgeYr;
      }
    }

    fundsLastAges.push(fundsLast);
  }

  // ── Percentile bands
  const agesList = Array.from(
    { length: longevity - age + 1 },
    (_, i) => age + i
  );

  const p10Curve = [Math.round(superBal)];
  const p50Curve = [Math.round(superBal)];
  const p90Curve = [Math.round(superBal)];

  for (let y = 0; y < totalYears; y++) {
    p10Curve.push(Math.round(Math.max(0, percentile(allBalances[y], 10))));
    p50Curve.push(Math.round(Math.max(0, percentile(allBalances[y], 50))));
    p90Curve.push(Math.round(Math.max(0, percentile(allBalances[y], 90))));
  }

  const retirementBalanceMedian =
    accYears < p50Curve.length ? p50Curve[accYears] : Math.round(superBal);

  const pensionAge67Idx = pensionAge - age;
  const balAt67 =
    pensionAge67Idx > 0 && pensionAge67Idx < p50Curve.length
      ? p50Curve[pensionAge67Idx]
      : retirementBalanceMedian;

  const pensionFnMedian = calculatePension(
    balAt67, pensionMax, assetsLower, assetsUpper, taper,
    incomeFree, deemingLow, deemingThr, deemingHigh
  );
  const pensionAnnualMedian = Math.round(pensionFnMedian * fnPerYear);

  const fundsLastP10 = Math.round(percentile(fundsLastAges, 10));
  const fundsLastP50 = Math.round(percentile(fundsLastAges, 50));
  const fundsLastP90 = Math.round(percentile(fundsLastAges, 90));

  return {
    ages: agesList,
    p10:  p10Curve,
    p50:  p50Curve,
    p90:  p90Curve,
    retirement_balance_median: retirementBalanceMedian,
    pension_annual:            pensionAnnualMedian,
    funds_last_p10:            fundsLastP10,
    funds_last_p50:            fundsLastP50,
    funds_last_p90:            fundsLastP90,
  };
}

module.exports = { runForecast };