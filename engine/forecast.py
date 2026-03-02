import numpy as np
import json
import sys

def run_forecast(inputs, config):
    # ── INPUTS
    age        = inputs['current_age']
    super_bal  = inputs['super_balance']
    salary     = inputs.get('salary') or 0
    spending   = inputs['annual_spending']
    retire_age = inputs['retirement_age']
    runs       = 1000

    # ── CONFIG
    ret_acc    = config['return_accumulation'] / 100
    ret_ret    = config['return_retirement'] / 100
    volatility = config['return_volatility'] / 100
    inflation  = config['inflation_rate'] / 100
    sg_rate    = config['sg_rate'] / 100

    pension_max  = (
        config['pension_base_single'] +
        config['pension_supplement_single'] +
        config['pension_energy_single']
    )
    assets_lower = config['assets_lower_single_owner']
    assets_upper = config['assets_upper_single_owner']
    taper        = config['assets_taper_rate']
    income_free  = config['income_free_area_single']
    deeming_low  = config['deeming_rate_lower'] / 100
    deeming_thr  = config['deeming_threshold_single']
    deeming_high = config['deeming_rate_upper'] / 100

    pension_age = 67
    longevity   = 90
    acc_years   = retire_age - age
    ret_years   = longevity - retire_age

    # ── FORTNIGHTLY SG COMPOUNDING
    fn_per_year    = 26
    sg_fortnightly = (salary * sg_rate) / fn_per_year

    # ── MONTE CARLO
    np.random.seed(42)
    acc_returns = np.random.normal(ret_acc, volatility, (runs, max(acc_years, 1)))
    ret_returns = np.random.normal(ret_ret, volatility * 0.8, (runs, max(ret_years, 1)))

    total_years  = acc_years + ret_years
    all_balances = np.zeros((runs, total_years))
    funds_last_ages = []

    for i in range(runs):
        bal = super_bal

        # Accumulation phase
        for y in range(acc_years):
            r = acc_returns[i, y]
            bal = bal + bal * r * 0.85 + sg_fortnightly * fn_per_year
            all_balances[i, y] = bal

        # Retirement phase
        funds_last = longevity
        for y in range(ret_years):
            current_age_yr = retire_age + y
            r = ret_returns[i, y]

            pension_fn = 0
            if current_age_yr >= pension_age:
                pension_fn = calculate_pension(
                    bal, pension_max, assets_lower, assets_upper,
                    taper, income_free, deeming_low, deeming_thr, deeming_high
                )

            pension_annual = pension_fn * fn_per_year
            real_spending  = spending * ((1 + inflation) ** y)
            net = bal * (1 + r) + pension_annual - real_spending
            bal = max(0, net)

            all_balances[i, acc_years + y] = bal

            if bal == 0 and funds_last == longevity:
                funds_last = current_age_yr

        funds_last_ages.append(funds_last)

    # ── PERCENTILE BANDS
    # Prepend starting balance so ages and curves align (current age to age 90)
    ages_list = list(range(age, longevity + 1))

    p10_curve = [round(float(super_bal))] + [round(float(np.percentile(all_balances[:, y], 10))) for y in range(total_years)]
    p50_curve = [round(float(super_bal))] + [round(float(np.percentile(all_balances[:, y], 50))) for y in range(total_years)]
    p90_curve = [round(float(super_bal))] + [round(float(np.percentile(all_balances[:, y], 90))) for y in range(total_years)]

    # Retirement balance = median curve at retirement age index
    retirement_balance_median = p50_curve[acc_years] if acc_years < len(p50_curve) else round(float(super_bal))

    # Pension calculated at median age-67 balance
    pension_age_67_idx = pension_age - age
    if 0 < pension_age_67_idx < len(p50_curve):
        bal_at_67 = p50_curve[pension_age_67_idx]
    else:
        bal_at_67 = retirement_balance_median

    pension_fn_median     = calculate_pension(
        bal_at_67, pension_max, assets_lower, assets_upper,
        taper, income_free, deeming_low, deeming_thr, deeming_high
    )
    pension_annual_median = round(pension_fn_median * fn_per_year)

    # Funds last percentiles
    funds_arr      = np.array(funds_last_ages)
    funds_last_p10 = int(np.percentile(funds_arr, 10))
    funds_last_p50 = int(np.percentile(funds_arr, 50))
    funds_last_p90 = int(np.percentile(funds_arr, 90))

    return {
        'ages': ages_list,
        'p10':  p10_curve,
        'p50':  p50_curve,
        'p90':  p90_curve,
        'retirement_balance_median': retirement_balance_median,
        'pension_annual':            pension_annual_median,
        'funds_last_p10':            funds_last_p10,
        'funds_last_p50':            funds_last_p50,
        'funds_last_p90':            funds_last_p90,
    }


def calculate_pension(bal, pension_max, assets_lower, assets_upper,
                      taper, income_free, deeming_low, deeming_thr, deeming_high):
    if bal >= assets_upper:
        return 0
    fn_per_year = 26

    # Assets test
    assets_reduction = max(0, (bal - assets_lower) // 1000) * taper
    pension_assets   = max(0, pension_max - assets_reduction)

    # Income test (deeming)
    if bal <= deeming_thr:
        deemed_annual = bal * deeming_low
    else:
        deemed_annual = (deeming_thr * deeming_low +
                         (bal - deeming_thr) * deeming_high)
    deemed_fn        = deemed_annual / fn_per_year
    income_reduction = max(0, (deemed_fn - income_free) * 0.50)
    pension_income   = max(0, pension_max - income_reduction)

    return min(pension_assets, pension_income)


if __name__ == '__main__':
    inputs = json.loads(sys.argv[1])
    config = json.loads(sys.argv[2])
    result = run_forecast(inputs, config)
    print(json.dumps(result))
