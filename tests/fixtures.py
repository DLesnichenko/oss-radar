"""Deterministic snapshot fixtures: 100 daily snapshots ending on END.

acme/orchestra  old repo, +10 stars/day until 30 days ago, then +30/day
acme/young      created 10 days before END, +100 stars/day
acme/gappy      old repo, +5 stars/day, no snapshots 10..40 days before END
"""
import json
import sys
from datetime import date, timedelta
from pathlib import Path

END = date(2026, 9, 27)
DAYS = 100


def _orchestra(k):
    if k >= 30:
        return 5000 + 10 * (99 - k)
    return 5690 + 30 * (30 - k)


def write_fixture_snapshots(directory):
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    for k in range(DAYS - 1, -1, -1):
        day = END - timedelta(days=k)
        repos = {
            "acme/orchestra": {
                "stars": _orchestra(k),
                "language": "Python",
                "description": "Multi-agent orchestrator",
                "topics": ["agents"],
                "created_at": "2025-01-01T00:00:00Z",
            }
        }
        if k <= 9:
            repos["acme/young"] = {
                "stars": 100 * (10 - k),
                "language": "TypeScript",
                "description": "Brand new agent <b>toolkit</b>",
                "topics": [],
                "created_at": (END - timedelta(days=10)).isoformat() + "T00:00:00Z",
            }
        if not 10 <= k <= 40:
            repos["acme/gappy"] = {
                "stars": 1000 + 5 * (99 - k),
                "language": "JavaScript",
                "description": "Security audit skill",
                "topics": [],
                "created_at": "2025-03-01T00:00:00Z",
            }
        path = directory / f"{day.isoformat()}.json"
        path.write_text(
            json.dumps({"date": day.isoformat(), "repos": repos}, ensure_ascii=False),
            encoding="utf-8",
        )


if __name__ == "__main__":
    write_fixture_snapshots(sys.argv[1])
