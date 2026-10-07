"""Serves the dashboard and JSON API. Run: python3 server.py [--port 8000] [--csv hourly.csv]"""
import argparse
import csv
import json
import os
from datetime import datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

import data
import kpis as K

STATIC = os.path.join(os.path.dirname(__file__), "static")
ROWS = []
NUMERIC = ["units_forecast", "units_demand", "units_done", "lines_done", "heads_scheduled", "heads_present",
           "hours_paid", "hours_productive", "hours_overtime", "backlog_units", "std_uph"]


def load_csv(path):
    with open(path, newline="") as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        for k in NUMERIC:
            r[k] = float(r[k])
    return rows


def window(days):
    last = max(r["ts"] for r in ROWS)[:10]
    start = (datetime.fromisoformat(last) - timedelta(days=days - 1)).date().isoformat()
    return [r for r in ROWS if r["ts"][:10] >= start]


def api(query):
    days = int(query.get("days", ["14"])[0])
    proc = query.get("process", [None])[0] or None
    rows = window(days)
    per = K.by_process(rows)
    return {"days": days, "process": proc, "overall": K.kpis(rows), "by_process": per,
            "trend": K.daily_trend(rows, proc), "hourly": K.hourly_profile(rows, proc),
            "alerts": K.alerts(per), "thresholds": __import__("config").THRESHOLDS}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        u = urlparse(self.path)
        if u.path == "/api/data":
            body, ctype = json.dumps(api(parse_qs(u.query))).encode(), "application/json"
        elif u.path in ("/", "/index.html"):
            body, ctype = open(os.path.join(STATIC, "index.html"), "rb").read(), "text/html"
        else:
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--csv", help="hourly CSV with the same columns as --export output")
    ap.add_argument("--export", help="write synthetic data to this CSV and exit")
    a = ap.parse_args()
    if a.export:
        rows = data.generate()
        with open(a.export, "w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0]))
            w.writeheader(); w.writerows(rows)
        print(f"wrote {len(rows)} rows to {a.export}")
        raise SystemExit
    ROWS = load_csv(a.csv) if a.csv else data.generate()
    print(f"http://localhost:{a.port}  ({len(ROWS)} hourly rows, {'CSV' if a.csv else 'synthetic'})")
    ThreadingHTTPServer(("0.0.0.0", a.port), Handler).serve_forever()
