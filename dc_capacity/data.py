"""Synthetic hourly labor/throughput data generator (stdlib only, deterministic by seed)."""
import random
from datetime import datetime, timedelta

from config import PROCESSES, TARGET_LABOR_UTILIZATION

# Share of daily volume by hour of day (two-shift operation, evening ship peak).
HOUR_PROFILE = {6: .03, 7: .05, 8: .06, 9: .07, 10: .07, 11: .06, 12: .04, 13: .06, 14: .08,
                15: .09, 16: .10, 17: .10, 18: .06, 19: .05, 20: .04, 21: .02, 22: .02}
DOW_FACTOR = [1.15, 1.05, 1.0, 1.0, 0.95, 0.45, 0.0]  # Mon..Sun
PROCESS_LINES_PER_UNIT = {"Receiving": 0.2, "Putaway": 0.25, "Picking": 0.6, "Packing": 0.5, "Loading": 0.1}


def generate(days=56, seed=7, end=None, base_daily_units=40000):
    rng = random.Random(seed)
    end = end or datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    rows = []
    backlog = {p: 0.0 for p in PROCESSES}
    for d in range(days):
        day = end - timedelta(days=days - 1 - d)
        trend = 1 + 0.25 * d / days  # ramp towards peak season
        forecast_day = base_daily_units * DOW_FACTOR[day.weekday()] * trend
        if forecast_day == 0:
            continue
        actual_day = forecast_day * rng.uniform(0.88, 1.15)
        for hour, share in HOUR_PROFILE.items():
            for p, cfg in PROCESSES.items():
                std = cfg["std_uph"]
                forecast = forecast_day * share
                demand = actual_day * share * rng.uniform(0.9, 1.1)
                # Plan headcount to forecast at target utilization, rounded up.
                sched = max(1, int(forecast / (std * TARGET_LABOR_UTILIZATION) + 0.999))
                absent = sum(rng.random() < 0.06 for _ in range(sched))
                present = sched - absent
                ot_hours = present * 0.12 * rng.random() if backlog[p] > 0 else 0.0
                paid = present + ot_hours
                productive = paid * rng.uniform(0.74, 0.92)
                perf = rng.uniform(0.85, 1.08)
                capacity = productive * std * perf
                available = demand + backlog[p]
                done = min(available, capacity)
                backlog[p] = available - done
                rows.append({
                    "ts": day.replace(hour=hour).isoformat(timespec="minutes"),
                    "process": p,
                    "units_forecast": round(forecast, 1),
                    "units_demand": round(demand, 1),
                    "units_done": round(done, 1),
                    "lines_done": round(done * PROCESS_LINES_PER_UNIT[p], 1),
                    "heads_scheduled": sched,
                    "heads_present": present,
                    "hours_paid": round(paid, 2),
                    "hours_productive": round(productive, 2),
                    "hours_overtime": round(ot_hours, 2),
                    "backlog_units": round(backlog[p], 1),
                    "std_uph": std,
                })
    return rows
