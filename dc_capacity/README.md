# DC Labor & Throughput Capacity Monitor

Stdlib-only Python (3.9+) + single-page dashboard.

    python3 server.py                     # synthetic demo data, http://localhost:8000
    python3 server.py --export hourly.csv # write synthetic CSV (schema for your own data)
    python3 server.py --csv hourly.csv    # run on your own hourly, anonymized WMS/LMS export
    python3 -m unittest discover -s tests

KPIs (kpis.py): UPLH, performance to engineered standard, labor utilization, capacity utilization
(vs design capacity), labor coverage (present vs required heads), absenteeism, overtime %, backlog hours,
forecast MAPE, peak-to-average. Standards and RAG thresholds in config.py are placeholder assumptions;
replace with site engineered standards and targets before use. Input must contain no employee-identifying data.
