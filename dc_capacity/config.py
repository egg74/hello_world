"""Processes, engineered standards and RAG thresholds (all assumptions; replace with site values)."""

# Engineered labor standards: units per direct labor hour at 100% performance.
PROCESSES = {
    "Receiving": {"std_uph": 120, "share": 1.00},
    "Putaway":   {"std_uph": 60,  "share": 1.00},
    "Picking":   {"std_uph": 90,  "share": 1.00},
    "Packing":   {"std_uph": 75,  "share": 1.00},
    "Loading":   {"std_uph": 140, "share": 1.00},
}

TARGET_LABOR_UTILIZATION = 0.85   # productive / paid hours used when planning headcount

# (green_if, amber_if) - "higher" means higher is better, "lower" means lower is better.
THRESHOLDS = {
    "performance_to_standard": ("higher", 0.95, 0.85),
    "labor_utilization":       ("higher", 0.80, 0.70),
    "capacity_utilization":    ("band",   (0.70, 0.90), (0.60, 0.95)),  # too low = waste, too high = no buffer
    "labor_coverage":          ("higher", 1.00, 0.92),
    "absenteeism":             ("lower",  0.05, 0.08),
    "overtime_pct":            ("lower",  0.05, 0.10),
    "backlog_hours":           ("lower",  2.0,  6.0),
    "forecast_mape":           ("lower",  0.10, 0.20),
    "peak_to_avg":             ("lower",  1.8,  2.5),
}
