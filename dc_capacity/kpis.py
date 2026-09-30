"""Industry-standard DC labor & throughput KPIs computed from hourly rows."""
from collections import defaultdict

from config import THRESHOLDS, TARGET_LABOR_UTILIZATION


def _div(a, b):
    return a / b if b else 0.0


def rag(name, v):
    t = THRESHOLDS[name]
    if t[0] == "higher":
        return "green" if v >= t[1] else "amber" if v >= t[2] else "red"
    if t[0] == "lower":
        return "green" if v <= t[1] else "amber" if v <= t[2] else "red"
    lo, hi = t[1]; alo, ahi = t[2]
    return "green" if lo <= v <= hi else "amber" if alo <= v <= ahi else "red"


def kpis(rows):
    """KPIs for a set of rows (any mix of processes/hours)."""
    if not rows:
        return {}
    s = lambda k: sum(r[k] for r in rows)
    units, paid, prod = s("units_done"), s("hours_paid"), s("hours_productive")
    earned = sum(r["units_done"] / r["std_uph"] for r in rows)  # engineered hours earned
    design = sum(r["heads_scheduled"] * r["std_uph"] for r in rows)
    required = sum(r["units_forecast"] / (r["std_uph"] * TARGET_LABOR_UTILIZATION) for r in rows)
    hourly = defaultdict(float)
    for r in rows:
        hourly[r["ts"]] += r["units_done"]
    avg_h = _div(sum(hourly.values()), len(hourly))
    last_ts = max(r["ts"] for r in rows)
    backlog = sum(r["backlog_units"] for r in rows if r["ts"] == last_ts)
    tput_per_hour = _div(units, len(hourly))
    ape = [abs(r["units_demand"] - r["units_forecast"]) / r["units_demand"] for r in rows if r["units_demand"]]
    out = {
        "units": units,
        "lines": s("lines_done"),
        "uplh": _div(units, paid),                                  # units per paid labor hour
        "performance_to_standard": _div(earned, prod),              # earned hrs / productive hrs
        "labor_utilization": _div(prod, paid),                      # productive / paid hrs
        "capacity_utilization": _div(units, design),                # output / design capacity
        "labor_coverage": _div(s("heads_present"), required),
        "absenteeism": 1 - _div(s("heads_present"), s("heads_scheduled")),
        "overtime_pct": _div(s("hours_overtime"), paid),
        "backlog_units": backlog,
        "backlog_hours": _div(backlog, tput_per_hour),
        "forecast_mape": _div(sum(ape), len(ape)),
        "peak_to_avg": _div(max(hourly.values()), avg_h),
    }
    out["status"] = {k: rag(k, out[k]) for k in THRESHOLDS}
    return out


def by_process(rows):
    g = defaultdict(list)
    for r in rows:
        g[r["process"]].append(r)
    return {p: kpis(v) for p, v in sorted(g.items())}


def daily_trend(rows, process=None):
    g = defaultdict(list)
    for r in rows:
        if process in (None, r["process"]):
            g[r["ts"][:10]].append(r)
    return [{"date": d, **{k: v for k, v in kpis(g[d]).items() if k != "status"}} for d in sorted(g)]


def hourly_profile(rows, process=None):
    """Average units done vs. average design capacity per hour of day."""
    g = defaultdict(list)
    for r in rows:
        if process in (None, r["process"]):
            g[int(r["ts"][11:13])].append(r)
    days = lambda rs: len({r["ts"][:10] for r in rs})
    return [{"hour": h,
             "units": sum(r["units_done"] for r in rs) / days(rs),
             "capacity": sum(r["heads_scheduled"] * r["std_uph"] for r in rs) / days(rs),
             "demand": sum(r["units_demand"] for r in rs) / days(rs)} for h, rs in sorted(g.items())]


def alerts(proc_kpis):
    out = []
    for p, k in proc_kpis.items():
        for name, status in k["status"].items():
            if status != "green":
                out.append({"process": p, "kpi": name, "value": k[name], "severity": status})
    out.sort(key=lambda a: (a["severity"] != "red", a["process"], a["kpi"]))
    return out
