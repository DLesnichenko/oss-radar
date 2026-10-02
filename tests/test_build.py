import json
import tempfile
import unittest
from pathlib import Path

from collector import build, classify
from tests.fixtures import END, write_fixture_snapshots

RULES = classify.load_rules(
    Path(__file__).resolve().parent.parent / "collector" / "categories.json"
)
TODAY = END.isoformat()


class BuildTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._tmp = tempfile.TemporaryDirectory()
        write_fixture_snapshots(cls._tmp.name)
        cls.radar = build.build(Path(cls._tmp.name), RULES, {})
        cls.today = cls.radar["by_date"][TODAY]
        cls.p = {x["repo"]: x for x in cls.today["projects"]}

    @classmethod
    def tearDownClass(cls):
        cls._tmp.cleanup()

    def test_dates_sorted_descending(self):
        self.assertEqual(self.radar["dates"][0], TODAY)
        self.assertEqual(self.radar["dates"], sorted(self.radar["dates"], reverse=True))

    def test_window_and_weeks(self):
        self.assertEqual(self.today["window"], {"from": "2026-06-29", "to": TODAY})
        self.assertEqual(len(self.today["weeks"]), 10)
        self.assertEqual(self.today["weeks"][-1], TODAY)

    def test_growth_acceleration_and_status(self):
        o = self.p["acme/orchestra"]
        self.assertEqual(o["stars"], 6590)
        self.assertEqual((o["growth7"], o["growth30"], o["growth90"]), (210, 900, 1500))
        self.assertEqual(o["acceleration"], 3.0)
        self.assertEqual(o["status"], "ускоряется")
        self.assertEqual(o["active_days"], 30)
        self.assertEqual(o["weekly"][-1], 210)

    def test_category_industry_and_purpose(self):
        o = self.p["acme/orchestra"]
        self.assertEqual(o["category"], "Оркестрация агентов")
        self.assertIsNone(o["industry"])
        self.assertEqual(o["purpose"], "Multi-agent orchestrator")
        g = self.p["acme/gappy"]
        self.assertEqual((g["industry"], g["category"]), ("Кибербезопасность", "Вертикальные агенты"))
        self.assertEqual(o["url"], "https://github.com/acme/orchestra")

    def test_young_repo_growth_equals_total_stars(self):
        y = self.p["acme/young"]
        self.assertEqual(y["stars"], 1000)
        self.assertEqual(y["growth90"], 1000)
        self.assertEqual(y["growth30"], 1000)
        self.assertEqual(y["growth7"], 700)
        self.assertIsNone(y["acceleration"])
        self.assertEqual(y["status"], "ускоряется")
        self.assertEqual(y["first_seen"], "2026-09-18")

    def test_snapshot_gap_gives_null_not_wrong_number(self):
        g = self.p["acme/gappy"]
        self.assertIsNone(g["growth30"])
        self.assertIsNone(g["status"])
        self.assertEqual(g["growth7"], 35)
        self.assertEqual(g["growth90"], 450)

    def test_purpose_override_is_used(self):
        radar = build.build(Path(self._tmp.name), RULES, {"acme/orchestra": "Своя фраза"})
        got = {x["repo"]: x for x in radar["by_date"][TODAY]["projects"]}
        self.assertEqual(got["acme/orchestra"]["purpose"], "Своя фраза")

    def test_output_is_json_serialisable(self):
        json.dumps(self.radar, ensure_ascii=False)

    def test_repo_only_listed_on_dates_it_has_a_snapshot(self):
        early = self.radar["by_date"][self.radar["dates"][-1]]["projects"]
        self.assertNotIn("acme/young", {x["repo"] for x in early})


if __name__ == "__main__":
    unittest.main()
