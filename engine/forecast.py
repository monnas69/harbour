import numpy as np
import json
import sys

def run_forecast(inputs, config):
    # ── INPUTS
    age         = inputs['age']
    super_bal   = inputs['superBal']
    salary      = inputs['salary']
    spending    = inputs['spending']
    retire_age  = inputs['retireAge']
    runs        = 1000

    # ── CONFIG
    ret_acc     = config['return_accumulation'] / 100
    ret_ret     = config['return_retirement'] / 100
    volatility  = config['return_volatility'] / 100
    inflation   = config['inflation_rate'] / 100
    sg_rate     = config['sg_rate'] / 100

    pension_max = (
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

    pension_age  = 67
    longevity    = 90
    acc_years    = retire_age - age
    ret_years    = longevity - retire_age

    # ── FORTNIGHTLY SG COMPOUNDING
    fn_per_year     = 26
    sg_fortnightly  = (salary * sg_rate) / fn_per_year
    r_fn_acc        = ret_acc / fn_per_year
    n_fn            = acc_years * fn_per_year

    # ── MONTE CARLO
    np.random.seed(42)

    acc_returns = np.random.normal(ret_acc, volatility, (runs, acc_years))
    ret_returns = np.random.normal(ret_ret, volatility * 0.8, (runs, ret_years))

    final_balances = []

    for i in range(runs):
        bal = super_bal
        for y in range(acc_years):
            r = acc_returns[i, y]
            bal = bal * (1 + r) * 0.85 + sg_fortnightly * fn_per_year
        
        balance_at_retirement = bal

        bal = balance_at_retirement
        for y in range(ret_years):
            current_age = retire_age + y
            r = ret_returns[i, y]

            pension_fn = 0
            if current_age >= pension_age:
                assets_reduction = max(0, (bal - assets_lower) // 1000) * taper
                pension_assets = max(0, pension_max - assets_reduction)

                if bal <= deeming_thr:
                    deemed_annual = bal * deeming_low
                else:
                    deemed_annual = (deeming_thr * deeming_low +
                                    (bal - deeming_thr) * deeming_high)
                deemed_fn = deemed_annual / fn_per_year
                income_reduction = max(0, (deemed_fn - income_free) * 0.50)
                pension_income = max(0, pension_max - income_reduction)

                pension_fn = min(pension_assets, pension_income)

            pension_annual = pension_fn * fn_per_year

            real_spending = spending * ((1 + inflation) ** y)

            net = bal * (1 + r) + pension_annual - real_spending
            bal = max(0, net)

        final_balances.append(balance_at_retirement)

    final_balances = np.array(final_balances)

    result = {
        'balanceAtRetirement': {
            'p10': round(float(np.percentile(final_balances, 10))),
            'p50': round(float(np.percentile(final_balances, 50))),
            'p90': round(float(np.percentile(final_balances, 90))),
        },
        'pensionFortnightly': round(calculate_pension(
            np.percentile(final_balances, 50),
            pension_max, assets_lower, assets_upper, taper,
            income_free, deeming_low, deeming_thr, deeming_high
        )),
        'inputSummary': {
            'age': age,
            'retireAge': retire_age,
            'superBal': super_bal,
            'salary': salary,
            'spending': spending,
        }
    }

    return result


def calculate_pension(bal, pension_max, assets_lower, assets_upper,
                      taper, income_free, deeming_low, deeming_thr, deeming_high):
    if bal >= assets_upper:
        return 0
    fn_per_year = 26
    assets_reduction = max(0, (bal - assets_lower) // 1000) * taper
    pension_assets = max(0, pension_max - assets_reduction)

    if bal <= deeming_thr:
        deemed_annual = bal * deeming_low
    else:
        deemed_annual = (deeming_thr * deeming_low +
                        (bal - deeming_thr) * deeming_high)
    deemed_fn = deemed_annual / fn_per_year
    income_reduction = max(0, (deemed_fn - income_free) * 0.50)
    pension_income = max(0, pension_max - income_reduction)

    return min(pension_assets, pension_income)


if __name__ == '__main__':
    inputs = json.loads(sys.argv[1])
    config = json.loads(sys.argv[2])
    result = run_forecast(inputs, config)
    print(json.dumps(result))