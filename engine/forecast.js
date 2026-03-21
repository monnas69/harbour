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
function minDrawdownRate(age, drUnder65, dr65_74, dr75_79, dr80_84, dr85_89, dr90plus) {
  if (age < 65) return drUnder65;
  if (age < 75) return dr65_74;
  if (age < 80) return dr75_79;
  if (age < 85) return dr80_84;
  if (age < 90) return dr85_89;
  return dr90plus;
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
// options.longevity — override the default age-90 horizon (e.g. 85, 95)
//
// Couples support: when inputs.has_partner = true, the engine accepts partner
// details and treats the couple as a single combined household pool:
//   - Combined super balance (both partners)
//   - Combined SG + contributions during accumulation
//   - Age Pension assessed on combined assets using couple Centrelink thresholds
//   - Partner retires at the same time as the primary user (MVP simplification)
function runForecast(inputs, config, options = {}) {

  // ── Inputs ────────────────────────────────────────────────────────────────
  const age             = inputs.current_age;
  const hasPartner      = !!inputs.has_partner;
  const salary          = inputs.salary || 0;
  const salarySacrifice = inputs.salary_sacrifice || 0; // annual, pre-tax
  const ncc             = inputs.ncc || 0;              // annual, after-tax
  const spending        = inputs.annual_spending;
  const retireAge       = inputs.retirement_age;
  const runs            = 1000;

  // Combine super balances when couple
  const partnerSuperBal        = hasPartner ? (inputs.partner_super_balance || 0) : 0;
  const partnerSalary          = hasPartner ? (inputs.partner_salary || 0) : 0;
  const partnerSalarySacrifice = hasPartner ? (inputs.partner_salary_sacrifice || 0) : 0;
  const partnerNcc             = hasPartner ? (inputs.partner_ncc || 0) : 0;
  const superBal               = inputs.super_balance + partnerSuperBal;

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

  // ATO minimum drawdown rates — all bands configurable via admin
  const drUnder65 = (config.drawdown_under_65 !== undefined ? config.drawdown_under_65 : 4)  / 100;
  const dr65_74   = (config.drawdown_65_74   !== undefined ? config.drawdown_65_74   : 5)  / 100;
  const dr75_79   = (config.drawdown_75_79   !== undefined ? config.drawdown_75_79   : 6)  / 100;
  const dr80_84   = (config.drawdown_80_84   !== undefined ? config.drawdown_80_84   : 7)  / 100;
  const dr85_89   = (config.drawdown_85_89   !== undefined ? config.drawdown_85_89   : 9)  / 100;
  const dr90plus  = (config.drawdown_90_plus !== undefined ? config.drawdown_90_plus : 11) / 100;

  // Centrelink config — use couple thresholds when has_partner, single otherwise
  // For couples: pensionMax is the COMBINED maximum (both partners × each rate)
  const pensionMax = hasPartner
    ? (config.pension_base_couple + config.pension_supplement_couple + config.pension_energy_couple) * 2
    : config.pension_base_single + config.pension_supplement_single + config.pension_energy_single;
  const assetsLower = hasPartner ? config.assets_lower_couple_owner : config.assets_lower_single_owner;
  const assetsUpper = hasPartner ? config.assets_upper_couple_owner : config.assets_upper_single_owner;
  const taper       = config.assets_taper_rate;
  const incomeFree  = hasPartner ? config.income_free_area_couple : config.income_free_area_single;
  const deemingLow  = config.deeming_rate_lower  / 100;
  const deemingThr  = hasPartner ? config.deeming_threshold_couple : config.deeming_threshold_single;
  const deemingHigh = config.deeming_rate_upper  / 100;

  const pensionAge = 67;
  const longevity  = options.longevity || 90;
  const accYears   = Math.max(retireAge - age, 1);
  const retYears   = Math.max(longevity - retireAge, 1);
  const totalYears = accYears + retYears;
  const fnPerYear  = 26;

  // ── Contributions ─────────────────────────────────────────────────────────
  // Primary member
  // Concessional (SG + salary sacrifice): taxed at 15% on entry
  const sgFortnightly              = (salary * sgRate) / fnPerYear;
  const salarySacrificeFortnightly = salarySacrifice / fnPerYear;
  const concFortnightlyAfterTax    =
    (sgFortnightly + salarySacrificeFortnightly) * 0.85;
  const nccFortnightly = ncc / fnPerYear;

  // Partner contributions (combined into same pool when has_partner)
  const partnerSgFn       = (partnerSalary * sgRate) / fnPerYear;
  const partnerSsFn       = partnerSalarySacrifice / fnPerYear;
  const partnerConcFnAft  = (partnerSgFn + partnerSsFn) * 0.85;
  const partnerNccFn      = partnerNcc / fnPerYear;

  // Total annual contribution into combined super pool after all applicable tax
  const annualContrib =
    (concFortnightlyAfterTax + nccFortnightly + partnerConcFnAft + partnerNccFn) * fnPerYear;

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

  // ── Transfer Balance Cap — per person ─────────────────────────────────────
  // Each partner has their own TBC ($1.9 M). For couples the effective combined
  // cap is 2 × TBC so that both partners' balances can sit in the tax-free
  // pension phase up to the full cap each. Using the single TBC against the
  // combined balance would incorrectly leave excess in accumulation phase and
  // over-tax couple investment earnings.
  const effectiveTbc = tbc * (hasPartner ? 2 : 1);

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
    //   penBal — tax-free pension phase (up to effective TBC)
    //   accBal — accumulation phase (excess above TBC, earnings taxed at 15%)
    let penBal = Math.min(bal, effectiveTbc);
    let accBal = Math.max(0, bal - effectiveTbc);

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
      const minDrawdown = penBal * minDrawdownRate(currentAge, drUnder65, dr65_74, dr75_79, dr80_84, dr85_89, dr90plus);

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

      // Use < 1 rather than === 0: when only the ATO minimum drawdown is being
      // withdrawn (pension covers all spending), penBal decays geometrically
      // and never reaches exactly zero due to floating-point arithmetic.
      // Treating a balance below $1 as effectively depleted prevents the
      // binary search from treating every spending level as "sustainable".
      if (newTotal < 1 && fundsLast === longevity) {
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

// ── Reverse forecast: "How much can I safely spend?" ─────────────────────────
// Finds the highest annual spending such that funds are projected to last until
// targetHorizon at each confidence level:
//
//   safe_spending_conservative  — p10 depletion age = targetHorizon
//                                 90 % of scenarios last to target (cautious)
//   safe_spending_balanced      — p50 depletion age = targetHorizon
//                                 50 % of scenarios last to target (median)
//   safe_spending_aggressive    — p90 depletion age = targetHorizon
//                                 10 % of scenarios last to target (optimistic)
//
// The full Monte Carlo forecast at the balanced spending level is merged into
// the return value so the caller has chart curves and stat cards ready.
function runSafeSpending(inputs, config, targetHorizon) {
  const MAX_ITER = 30;
  const TOLERANCE = 100; // converge to within $100 p.a.

  // Binary search: find the highest spending where fundsLastKey >= targetHorizon.
  // Higher spending → funds deplete sooner → fundsLastKey decreases.
  function findSpendingForKey(key) {
    let lo = 0;
    // Use the full combined household balance as the basis for the upper bound
    // so the bracket is correctly sized for couples with large partner balances.
    const combinedBalance = inputs.super_balance + (inputs.partner_super_balance || 0);
    let hi = Math.max(1_000_000, combinedBalance * 2);

    // Confirm hi is above the tipping point (funds run out before target at hi).
    // If not, keep doubling hi (up to a hard cap of $5 m/yr).
    let hiResult = runForecast(
      { ...inputs, annual_spending: hi }, config, { longevity: targetHorizon }
    );
    while (hiResult[key] >= targetHorizon && hi < 5_000_000) {
      hi *= 2;
      hiResult = runForecast(
        { ...inputs, annual_spending: hi }, config, { longevity: targetHorizon }
      );
    }

    // If even lo=0 can't reach the target the balance is too small — return 0.
    const loResult = runForecast(
      { ...inputs, annual_spending: 0 }, config, { longevity: targetHorizon }
    );
    if (loResult[key] < targetHorizon) return 0;

    for (let iter = 0; iter < MAX_ITER; iter++) {
      if (hi - lo <= TOLERANCE) break;
      const mid = (lo + hi) / 2;
      const result = runForecast(
        { ...inputs, annual_spending: mid }, config, { longevity: targetHorizon }
      );
      if (result[key] >= targetHorizon) {
        lo = mid; // this spending level is still safe — try higher
      } else {
        hi = mid; // spending is too high — reduce
      }
    }

    return Math.round(lo / 100) * 100; // round to nearest $100
  }

  const safeSpendingConservative = findSpendingForKey('funds_last_p10');
  const safeSpendingBalanced     = findSpendingForKey('funds_last_p50');
  const safeSpendingAggressive   = findSpendingForKey('funds_last_p90');

  // Run a full forecast at the balanced spending level for chart and stat cards.
  // Model at least to age 90 so shorter horizons still get a useful chart range.
  const chartLongevity = Math.max(targetHorizon, 90);
  const fullForecast = runForecast(
    { ...inputs, annual_spending: safeSpendingBalanced },
    config,
    { longevity: chartLongevity }
  );

  return {
    safe_spending_conservative: safeSpendingConservative,
    safe_spending_balanced:     safeSpendingBalanced,
    safe_spending_aggressive:   safeSpendingAggressive,
    target_horizon:             targetHorizon,
    ...fullForecast,
  };
}

module.exports = { runForecast, runSafeSpending };
