"""Build data/radar.json from daily snapshots.

Usage (from github_trend_radar/):
    py -3.10 -m collector.build --snapshots data/snapshots --out data/radar.json
"""
import argparse
import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from collector import classify, metrics

WEEKS = 10
WINDOW_DAYS = 90
DEFAULT_RULES = Path(__file__).resolve().parent / "categories.json"


def load_snapshots(directory):
    snapshots = {}
    for path in sorted(Path(directory).glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        snapshots[date.fromisoformat(data["date"])] = data["repos"]
    return snapshots


def _histories(snapshots):
    histories = {}
    for day, repos in snapshots.items():
        for name, entry in repos.items():
            histories.setdefault(name, {})[day] = entry["stars"]
    return histories


def _meta(snapshots, name):
    for day in sorted(snapshots, reverse=True):
        entry = snapshots[day].get(name)
        if entry and entry.get("created_at"):
            return entry
    return {}


def _project(name, day, history, meta, rules, purposes):
    created = date.fromisoformat(meta["created_at"][:10]) if meta.get("created_at") else None
    g30 = metrics.growth(history, day, 30, created)
    accel = metrics.acceleration(history, day, created)
    repo = {
        "name": name,
        "description": meta.get("description"),
        "topics": meta.get("topics"),
    }
    return {
        "repo": name,
        "url": f"https://github.com/{name}",
        "language": meta.get("language"),
        "category": classify.category_of(repo, rules),
        "industry": classify.industry_of(repo, rules),
        "status": metrics.status(g30, accel),
        "purpose": purposes.get(name) or meta.get("description") or "",
        "stars": history[day],
        "growth7": metrics.growth(history, day, 7, created),
        "growth30": g30,
        "growth90": metrics.growth(history, day, 90, created),
        "acceleration": None if accel is None else round(accel, 2),
        "active_days": metrics.active_days(history, day),
        "first_seen": min(history).isoformat(),
        "weekly": metrics.weekly_gains(history, day, WEEKS, created),
    }


def build(snapshots_dir, rules, purposes):
    snapshots = load_snapshots(snapshots_dir)
    histories = _histories(snapshots)
    metas = {name: _meta(snapshots, name) for name in histories}
    by_date = {}
    for day in sorted(snapshots, reverse=True):
        if not snapshots[day]:
            continue
        projects = [
            _project(name, day, histories[name], metas[name], rules, purposes)
            for name in snapshots[day]
        ]
        projects.sort(key=lambda p: p["stars"], reverse=True)
        by_date[day.isoformat()] = {
            "window": {
                "from": (day - timedelta(days=WINDOW_DAYS)).isoformat(),
                "to": day.isoformat(),
            },
            "weeks": [
                (day - timedelta(days=7 * (WEEKS - 1 - i))).isoformat() for i in range(WEEKS)
            ],
            "projects": projects,
        }
    return {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "dates": list(by_date),
        "by_date": by_date,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--snapshots", default="data/snapshots")
    parser.add_argument("--out", default="data/radar.json")
    parser.add_argument("--rules", default=str(DEFAULT_RULES))
    parser.add_argument("--purposes", default="data/purposes.json")
    args = parser.parse_args()
    purposes_path = Path(args.purposes)
    purposes = (
        json.loads(purposes_path.read_text(encoding="utf-8")) if purposes_path.exists() else {}
    )
    radar = build(args.snapshots, classify.load_rules(args.rules), purposes)
    Path(args.out).write_text(
        json.dumps(radar, ensure_ascii=False, indent=1), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
