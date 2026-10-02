import json
import tempfile
import unittest
from datetime import date
from pathlib import Path

from collector import collect

TODAY = date(2026, 9, 27)


def repo_json(stars, **extra):
    body = {
        "stargazers_count": stars,
        "language": "Python",
        "description": "d",
        "topics": ["agents"],
        "created_at": "2025-01-01T00:00:00Z",
    }
    body.update(extra)
    return body


class FakeHttp:
    """Routes by URL substring: {substring: (status, body, headers)}; first match wins."""

    def __init__(self, routes):
        self.routes = routes
        self.calls = []

    def __call__(self, url, headers):
        self.calls.append((url, headers))
        for needle, response in self.routes.items():
            if needle in url:
                return response
        return 404, {"message": "Not Found"}, {}


class CollectTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.out = Path(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def test_writes_one_snapshot_with_watchlist_and_search_results(self):
        http = FakeHttp(
            {
                "/search/repositories": (200, {"items": [{"full_name": "b/two"}, {"full_name": "a/one"}]}, {}),
                "/repos/a/one": (200, repo_json(10), {}),
                "/repos/b/two": (200, repo_json(20), {}),
            }
        )
        path = collect.collect(http, ["a/one"], ["topic:mcp"], 10, self.out, TODAY)
        self.assertEqual(path, self.out / "2026-09-27.json")
        data = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(data["date"], "2026-09-27")
        self.assertEqual(set(data["repos"]), {"a/one", "b/two"})
        self.assertEqual(
            data["repos"]["b/two"],
            {
                "stars": 20,
                "language": "Python",
                "description": "d",
                "topics": ["agents"],
                "created_at": "2025-01-01T00:00:00Z",
            },
        )

    def test_deleted_repo_is_skipped_others_kept(self):
        http = FakeHttp(
            {
                "/search/repositories": (200, {"items": []}, {}),
                "/repos/a/gone": (404, {"message": "Not Found"}, {}),
                "/repos/a/ok": (200, repo_json(5), {}),
            }
        )
        path = collect.collect(http, ["a/gone", "a/ok"], ["q"], 10, self.out, TODAY)
        self.assertEqual(set(json.loads(path.read_text(encoding="utf-8"))["repos"]), {"a/ok"})

    def test_rate_limit_raises_and_writes_nothing(self):
        http = FakeHttp(
            {
                "/repos/a/one": (200, repo_json(1), {}),
                "/repos/a/two": (403, {"message": "rate limit"}, {"x-ratelimit-remaining": "0"}),
            }
        )
        with self.assertRaises(collect.RateLimited):
            collect.collect(http, ["a/one", "a/two"], [], 10, self.out, TODAY)
        self.assertEqual(list(self.out.iterdir()), [])

    def test_candidate_limit_and_dedupe(self):
        http = FakeHttp(
            {"/search/repositories": (200, {"items": [{"full_name": n} for n in ("x/1", "x/2", "x/1", "x/3")]}, {})}
        )
        self.assertEqual(collect.search_candidates(http, ["q"], 2), ["x/1", "x/2"])


class BackfillTest(unittest.TestCase):
    def setUp(self):
        self._tmp = tempfile.TemporaryDirectory()
        self.out = Path(self._tmp.name)

    def tearDown(self):
        self._tmp.cleanup()

    def stargazers(self):
        stamps = ["2026-09-20T10:00:00Z", "2026-09-20T11:00:00Z", "2026-09-25T09:00:00Z",
                  "2026-09-27T01:00:00Z", "2026-09-27T02:00:00Z"]
        return [{"starred_at": s, "user": {}} for s in stamps]

    def test_cumulative_counts_per_day_and_star_json_header(self):
        http = FakeHttp(
            {
                "/stargazers": (200, self.stargazers(), {}),
                "/repos/a/one": (200, repo_json(5), {}),
            }
        )
        collect.backfill(http, ["a/one"], self.out, TODAY, days=10)
        stars = {
            p.stem: json.loads(p.read_text(encoding="utf-8"))["repos"]["a/one"]["stars"]
            for p in self.out.glob("*.json")
        }
        self.assertEqual(stars["2026-09-19"], 0)
        self.assertEqual(stars["2026-09-20"], 2)
        self.assertEqual(stars["2026-09-24"], 2)
        self.assertEqual(stars["2026-09-25"], 3)
        self.assertEqual(stars["2026-09-26"], 3)
        self.assertNotIn("2026-09-27", stars)
        sg_headers = [h for url, h in http.calls if "/stargazers" in url]
        self.assertTrue(all("star+json" in h["Accept"] for h in sg_headers))

    def test_existing_entries_are_not_overwritten(self):
        existing = {"date": "2026-09-25", "repos": {"a/one": {"stars": 99}}}
        (self.out / "2026-09-25.json").write_text(json.dumps(existing), encoding="utf-8")
        http = FakeHttp(
            {"/stargazers": (200, self.stargazers(), {}), "/repos/a/one": (200, repo_json(5), {})}
        )
        collect.backfill(http, ["a/one"], self.out, TODAY, days=10)
        data = json.loads((self.out / "2026-09-25.json").read_text(encoding="utf-8"))
        self.assertEqual(data["repos"]["a/one"]["stars"], 99)


if __name__ == "__main__":
    unittest.main()
