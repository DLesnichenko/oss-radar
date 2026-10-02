"""Generate data/radar.json from made-up "demo/*" repositories for UI development.

Usage (from github_trend_radar/): py -3.10 -m tests.make_sample
The daily collector overwrites data/radar.json with real data.
"""
import json
import tempfile
from datetime import timedelta
from pathlib import Path

from collector import build, classify
from tests.fixtures import DAYS, END

BASE = Path(__file__).resolve().parent.parent
# name, description, topics, language, stars 100 days ago, stars/day before / during the last 30 days
DEMO = [
    ("demo/voice-studio", "Open voice studio: synthesis, cloning and audio editing", [], "Python", 8000, 90, 700),
    ("demo/orca", "Multi-agent orchestrator for long-running coding tasks", ["agents"], "TypeScript", 6000, 120, 600),
    ("demo/security-audit-skill", "Security audit skill for coding agents", [], "JavaScript", 3000, 50, 480),
    ("demo/hindsight", "Long-term memory and context compression for agents", [], "Python", 5000, 70, 400),
    ("demo/paper-clip", "Agent workflow engine with swarm scheduling", [], "TypeScript", 4000, 80, 280),
    ("demo/knora", "Knowledge base builder with agent framework", [], "Go", 2500, 60, 240),
    ("demo/from-scratch", "Prompt engineering playbook and methodology", [], "Python", 3500, 40, 230),
    ("demo/open-montage", "Video editing agent for content creators", [], "Python", 1500, 30, 190),
    ("demo/job-search", "AI job search and resume assistant", [], "Python", 1200, 25, 160),
    ("demo/video-use", "Browser tool for video understanding", [], "Rust", 900, 20, 150),
    ("demo/marketing-skills", "Marketing and sales skill pack", [], "JavaScript", 2000, 30, 140),
    ("demo/mcp-hub", "MCP server directory", ["mcp"], "Go", 7000, 90, 110),
    ("demo/doc-parser", "Document parsing utility", [], "Java", 4500, 45, 60),
    ("demo/html-kit", "Static page toolkit", [], "HTML", 3000, 20, 15),
]


def write_demo_snapshots(directory):
    directory = Path(directory)
    for k in range(DAYS - 1, -1, -1):
        day = END - timedelta(days=k)
        repos = {}
        for name, description, topics, language, start, slow, fast in DEMO:
            stars = start + slow * (99 - k) if k >= 30 else start + slow * 69 + fast * (30 - k)
            repos[name] = {
                "stars": stars,
                "language": language,
                "description": description,
                "topics": topics,
                "created_at": "2025-06-01T00:00:00Z",
            }
        (directory / f"{day.isoformat()}.json").write_text(
            json.dumps({"date": day.isoformat(), "repos": repos}, ensure_ascii=False),
            encoding="utf-8",
        )


def main():
    rules = classify.load_rules(BASE / "collector" / "categories.json")
    with tempfile.TemporaryDirectory() as tmp:
        write_demo_snapshots(tmp)
        radar = build.build(Path(tmp), rules, {})
    (BASE / "data" / "radar.json").write_text(
        json.dumps(radar, ensure_ascii=False, indent=1), encoding="utf-8"
    )


if __name__ == "__main__":
    main()
