import json
import sys
sys.path.insert(0, '.')
from engine.forecast import run_forecast

inputs = {
    "age": 58,
    "superBal": 420000,
    "salary": 80000,
    "spending": 51000,
    "retireAge": 65
}

config = {
    "return_accumulation": 6.5,
    "return_retirement": 5.5,
    "return_volatility": 12,
    "inflation_rate": 2.5,
    "sg_rate": 12,
    "pension_base_single": 1020.60,
    "pension_supplement_single": 83.40,
    "pension_energy_single": 14.10,
    "assets_lower_single_owner": 301750,
    "assets_upper_single_owner": 714500,
    "assets_taper_rate": 3,
    "income_free_area_single": 218,
    "deeming_rate_lower": 1.25,
    "deeming_threshold_single": 64200,
    "deeming_rate_upper": 3.25
}

result = run_forecast(inputs, config)
print(json.dumps(result, indent=2))