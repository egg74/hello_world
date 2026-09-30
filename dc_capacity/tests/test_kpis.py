import os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import data, kpis as K


def row(**kw):
    r = {"ts": "2026-01-05T08:00", "process": "Picking", "units_forecast": 900, "units_demand": 900, "units_done": 900,
         "lines_done": 540, "heads_scheduled": 10, "heads_present": 10, "hours_paid": 10, "hours_productive": 8,
         "hours_overtime": 0, "backlog_units": 0, "std_uph": 90}
    r.update(kw); return r


class T(unittest.TestCase):
    def test_known_values(self):
        k = K.kpis([row()])
        self.assertAlmostEqual(k["uplh"], 90)
        self.assertAlmostEqual(k["performance_to_standard"], 10 / 8)      # 900/90 earned hrs / 8 productive
        self.assertAlmostEqual(k["labor_utilization"], 0.8)
        self.assertAlmostEqual(k["capacity_utilization"], 1.0)            # 900 / (10*90)
        self.assertAlmostEqual(k["absenteeism"], 0)

    def test_absence_and_backlog(self):
        k = K.kpis([row(heads_present=8, backlog_units=450)])
        self.assertAlmostEqual(k["absenteeism"], 0.2)
        self.assertAlmostEqual(k["backlog_hours"], 0.5)

    def test_rag(self):
        self.assertEqual(K.rag("absenteeism", 0.03), "green")
        self.assertEqual(K.rag("absenteeism", 0.12), "red")
        self.assertEqual(K.rag("capacity_utilization", 0.99), "red")
        self.assertEqual(K.rag("capacity_utilization", 0.8), "green")

    def test_synthetic_end_to_end(self):
        rows = data.generate(days=14, seed=1)
        per = K.by_process(rows)
        self.assertEqual(set(per), set(__import__("config").PROCESSES))
        for v in per.values():
            self.assertTrue(0 < v["labor_utilization"] < 1)
        self.assertTrue(K.daily_trend(rows)); self.assertEqual(len(K.hourly_profile(rows)), 17)


unittest.main() if __name__ == "__main__" else None
