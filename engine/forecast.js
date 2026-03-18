// engine/forecast.js
// Harbour Monte Carlo retirement engine — JavaScript, no external dependencies.
//
// ── Enhancements over v1 ──────────────────────────────────────────────────────
//   v2 — Mid-year contribution compounding (fortnightly contributions earn
//         half-year average growth rather than zero)
//   v2 — ATO minimum drawdown rates enforced by age band (4–11%)
//   v2 — Transfer Balance Cap enforced at retirement — excess above cap stays
//         in accumulation phase and is taxed at 15% on earnings
//   v2 — Pension eligible-from-age: when pension = 0 at 67, scans p50 curve
//         to find first age pension becomes payable as balance reduces
//   v3 — Super fund fees applied as annual drag on investment returns in both
//         accumulation and retirement phases (config: fee_rate, default 0.67%)
// ─────────────────────────────────────────────────────────────────────────────

// ── Seeded PRNG (mulberry32) ──────────────────────────────────────────────────
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

// ── ATO minimum drawdown rates by age ─────────────────────────────────────────
// Source: ato.gov.au — legislated minimum annual pension payments
// Applied in retirement phase — if target spending is below this, the higher
// amount is withdrawn (reduces balance faster, more realistic for large balances)
// The first three bands are configurable via the admin dashboard.
function minDrawdownRate(age, drUnder65, dr65_74, dr75_79) {
  if (age < 65) return drUnder65;
  if (age < 75) return dr65_74;
  if (age < 80) return dr75_79;
  if (age < 85) return 0.07; // 7%
  if (age < 90) return 0.09; // 9%
  return 0.11;               // 11% — age 90+
}

// ── Centrelink Age Pension calculation ────────────────────────────────────────
// Applies both the assets test and income test (deeming), returns the lower
// of the two (Centrelink pays whichever test gives the lower entitlement).
// Returns fortnightly pension amount.
function calculatePension(
  bal,
  pensionMax,
  assetsLower,
  assetsUpper,
  taper,
  incomeFree,
  deemingLow,
  deemingThr,
  deemingHigh,
  incomeReductionRate = 0.5
) {
  if (bal <= 0) return pensionMax; // balance exhausted — full pension
  if (bal >= assetsUpper) return 0;

  const fnPerYear = 26;

  // Assets test: pension reduces $3/fn per $1,000 above lower threshold
  const assetsReduction =
    Math.max(0, Math.floor((bal - assetsLower) / 1000)) * taper;
  const pensionAssets = Math.max(0, pensionMax - assetsReduction);

  // Income test: deem assets to earn income, reduce pension on excess
  let deemedAnnual;
  if (bal <= deemingThr) {
    deemedAnnual = bal * deemingLow;
  } else {
    deemedAnnual =
      deemingThr * deemingLow + (bal - deemingThr) * deemingHigh;
  }
  const deemedFn = deemedAnnual / fnPerYear;
  const incomeReduction = Math.max(0, (deemedFn - incomeFree) * incomeReductionRate);
  const pensionIncome = Math.max(0, pensionMax - incomeReduction);

  // Lower of the two tests applies
  return Math.min(pensionAssets, pensionIncome);
}

// ── Main forecast function ────────────────────────────────────────────────────
function runForecast(inputs, config) {

  // ── Inputs ────────────────────────────────────────────────────────────────
  const age             = inputs.current_age;
  const superBal        = inputs.super_balance;
  const salary          = inputs.salary || 0;
  const salarySacrifice = inputs.salary_sacrifice || 0; // annual, pre-tax
  const ncc             = inputs.ncc || 0;              // annual, after-tax
  const spending        = inputs.annual_spending;
  const retireAge       = inputs.retirement_age;
  const runs            = 1000;

  // ── Config ────────────────────────────────────────────────────────────────
  const retAcc     = config.return_accumulation / 100;
  const retRet     = config.return_retirement   / 100;
  const volatility = config.return_volatility   / 100;
  const inflation  = config.inflation_rate      / 100;
  const sgRate     = config.sg_rate             / 100;
  const tbc        = config.transfer_balance_cap;

  // Super fund fee rate — applied as drag on net investment returns
  // Default 0.67% (ASIC/industry average) if not present in config
  const feeRate = (config.fee_rate !== undefined ? config.fee_rate : 0.67) / 100;

  // Income test reduction rate — default 50% (legislated rate) if not in config
  const incomeReductionRate = (config.income_reduction_rate !== undefined ? config.income_reduction_rate : 50) / 100;

  // ATO minimum drawdown rates (first three bands) — configurable via admin
  const drUnder65 = (config.drawdown_under_65 !== undefined ? config.drawdown_under_65 : 4) / 100;
  const dr65_74   = (config.drawdown_65_74   !== undefined ? config.drawdown_65_74   : 5) / 100;
  const dr75_79   = (config.drawdown_75_79   !== undefined ? config.drawdown_75_79   : 6) / 100;

  // Centrelink config
  const pensionMax =
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
  const fnPerYear  = 26;

  // ── Contributions ─────────────────────────────────────────────────────────
  // Concessional (SG + salary sacrifice): taxed at 15% on entry
  const sgFortnightly              = (salary * sgRate) / fnPerYear;
  const salarySacrificeFortnightly = salarySacrifice / fnPerYear;
  const concFortnightlyAfterTax    =
    (sgFortnightly + salarySacrificeFortnightly) * 0.85;

  // Non-concessional (after-tax savings): no tax on entry
  const nccFortnightly = ncc / fnPerYear;

  // Total annual contribution into super after all applicable tax
  const annualContrib =
    (concFortnightlyAfterTax + nccFortnightly) * fnPerYear;

  // ── Seeded PRNG — seed 42 for reproducible results ────────────────────────
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

  // ── Monte Carlo simulation ────────────────────────────────────────────────
  const allBalances = Array.from({ length: totalYears }, () =>
    new Array(runs).fill(0)
  );
  const fundsLastAges = [];

  for (let i = 0; i < runs; i++) {
    let bal = superBal;

    // ── Accumulation phase ──────────────────────────────────────────────────
    for (let y = 0; y < accYears; y++) {
      const r = accReturns[i][y];

      // Net return after 15% earnings tax and fund fees
      // Tax only applies to the investment earnings component
      const netAccReturn = r * 0.85 - feeRate;

      // Mid-year compounding for contributions:
      // Existing balance earns full year net return.
      // Annual contributions earn half-year net return on average
      // (approximates fortnightly contributions spread across the year).
      bal = bal * (1 + netAccReturn) +
            annualContrib * (1 + netAccReturn / 2);

      allBalances[y][i] = Math.max(0, bal);
    }

    // ── Retirement phase ────────────────────────────────────────────────────
    // Split balance at retirement between:
    //   penBal — tax-free pension phase (up to Transfer Balance Cap)
    //   accBal — accumulation phase (excess above TBC, earnings taxed at 15%)
    let penBal = Math.min(bal, tbc);
    let accBal = Math.max(0, bal - tbc);

    let fundsLast = longevity;

    for (let y = 0; y < retYears; y++) {
      const currentAge = retireAge + y;
      const r = retReturns[i][y];

      // Pension phase: tax-free earnings, fees still apply
      const netRetReturn = r - feeRate;

      // Accumulation phase: 15% earnings tax + fees
      const netAccReturn = r * 0.85 - feeRate;

      penBal = penBal * (1 + netRetReturn);
      accBal = accBal * (1 + netAccReturn);

      // Clamp to zero (fees could theoretically push very small balances negative)
      penBal = Math.max(0, penBal);
      accBal = Math.max(0, accBal);

      const totalBal = penBal + accBal;

      // Age Pension (from age 67, based on total balance each year)
      let pensionFn = 0;
      if (currentAge >= pensionAge) {
        pensionFn = calculatePension(
          totalBal, pensionMax, assetsLower, assetsUpper, taper,
          incomeFree, deemingLow, deemingThr, deemingHigh, incomeReductionRate
        );
      }
      const pensionAnnual = pensionFn * fnPerYear;

      // Inflation-adjusted spending target
      const realSpending = spending * Math.pow(1 + inflation, y);

      // ATO minimum drawdown — legislated floor on annual withdrawals
      // Applied to pension phase balance (the primary retirement account)
      const minDrawdown = penBal * minDrawdownRate(currentAge, drUnder65, dr65_74, dr75_79);

      // Net spending required from super after pension income
      const spendingFromSuper = Math.max(0, realSpending - pensionAnnual);

      // Actual withdrawal: higher of required spending or ATO minimum
      const actualWithdrawal = Math.max(spendingFromSuper, minDrawdown);

      // Withdraw from pension phase first, then accumulation phase
      if (actualWithdrawal <= penBal) {
        penBal -= actualWithdrawal;
      } else {
        const remainder = actualWithdrawal - penBal;
        penBal = 0;
        accBal = Math.max(0, accBal - remainder);
      }

      const newTotal = penBal + accBal;
      allBalances[accYears + y][i] = newTotal;

      if (newTotal === 0 && fundsLast === longevity) {
        fundsLast = currentAge;
      }
    }

    fundsLastAges.push(fundsLast);
  }

  // ── Percentile bands ──────────────────────────────────────────────────────
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

  // ── Age Pension at 67 ─────────────────────────────────────────────────────
  // Always use the age-67 balance (not retirement balance) for a more
  // realistic entitlement estimate — balance has already been drawing down
  // for several years by 67 if retirement age < 67
  const pensionAge67Idx = pensionAge - age;
  const balAt67 =
    pensionAge67Idx > 0 && pensionAge67Idx < p50Curve.length
      ? p50Curve[pensionAge67Idx]
      : retirementBalanceMedian;

  const pensionFnMedian = calculatePension(
    balAt67, pensionMax, assetsLower, assetsUpper, taper,
    incomeFree, deemingLow, deemingThr, deemingHigh, incomeReductionRate
  );
  const pensionAnnualMedian = Math.round(pensionFnMedian * fnPerYear);

  const fundsLastP10 = Math.round(percentile(fundsLastAges, 10));
  const fundsLastP50 = Math.round(percentile(fundsLastAges, 50));
  const fundsLastP90 = Math.round(percentile(fundsLastAges, 90));

  // ── Pension eligible-from-age scan ────────────────────────────────────────
  // When pension = 0 at 67 (balance too high), scan the p50 curve forward to
  // find the first age where balance drops below the upper assets threshold
  // and pension becomes payable. Shown to users as "eligible from age X".
  let pensionEligibleFromAge = null;
  if (pensionAnnualMedian === 0) {
    const scanFrom = Math.max(pensionAge, retireAge);
    for (let checkAge = scanFrom; checkAge <= longevity; checkAge++) {
      const idx = checkAge - age;
      if (idx >= 0 && idx < p50Curve.length) {
        const checkBal = p50Curve[idx];
        const checkPen = calculatePension(
          checkBal, pensionMax, assetsLower, assetsUpper, taper,
          incomeFree, deemingLow, deemingThr, deemingHigh, incomeReductionRate
        );
        if (checkPen > 0) {
          pensionEligibleFromAge = checkAge;
          break;
        }
      }
    }
  }

  // ── Output ────────────────────────────────────────────────────────────────
  return {
    ages:                       agesList,
    p10:                        p10Curve,
    p50:                        p50Curve,
    p90:                        p90Curve,
    retirement_balance_median:  retirementBalanceMedian,
    pension_annual:             pensionAnnualMedian,
    pension_eligible_from_age:  pensionEligibleFromAge,
    funds_last_p10:             fundsLastP10,
    funds_last_p50:             fundsLastP50,
    funds_last_p90:             fundsLastP90,
  };
}

module.exports = { runForecast };
