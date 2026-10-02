"""Collect a daily star snapshot from the GitHub API (stdlib only).

Usage (from github_trend_radar/):
    py -3.10 -m collector.collect              # today's snapshot
    py -3.10 -m collector.collect --backfill   # restore the last 90 days for the watchlist
Set GITHUB_TOKEN to raise the API rate limit.
"""
import argparse
import json
import math
import os
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, timedelta
from pathlib import Path

API = "https://api.github.com"
TOPICS = ["ai-agents", "agent-skills", "mcp", "llm-agents"]
RECENT_DAYS = 180
GONE = (404, 410, 451)
BASE_DIR = Path(__file__).resolve().parent.parent


class RateLimited(Exception):
    pass


def default_http(url, headers):
    all_headers = {"Accept": "application/vnd.github+json", "User-Agent": "oss-radar"}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        all_headers["Authorization"] = f"Bearer {token}"
    all_headers.update(headers)
    request = urllib.request.Request(url, headers=all_headers)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            status, raw, resp_headers = response.status, response.read(), response.headers
    except urllib.error.HTTPError as err:
        status, raw, resp_headers = err.code, err.read(), err.headers
    try:
        body = json.loads(raw)
    except ValueError:
        body = {}
    return status, body, {k.lower(): v for k, v in resp_headers.items()}


def _get(http, url, headers=None):
    status, body, resp_headers = http(url, headers or {})
    if status == 429 or (status == 403 and resp_headers.get("x-ratelimit-remaining") == "0"):
        raise RateLimited(url)
    return status, body


def search_candidates(http, queries, limit):
    found = []
    for query in queries:
        url = f"{API}/search/repositories?q={urllib.parse.quote(query)}&sort=stars&order=desc&per_page=30"
        status, body = _get(http, url)
        if status != 200:
            raise RuntimeError(f"GitHub search returned {status} for {query!r}")
        for item in body.get("items", []):
            if item["full_name"] not in found:
                found.append(item["full_name"])
    return found[:limit]


def fetch_repo(http, full_name):
    status, body = _get(http, f"{API}/repos/{full_name}")
    if status in GONE:
        return None
    if status != 200:
        raise RuntimeError(f"GitHub returned {status} for {full_name}")
    return {
        "stars": body["stargazers_count"],
        "language": body.get("language"),
        "description": body.get("description"),
        "topics": body.get("topics") or [],
        "created_at": body.get("created_at"),
    }


def _read_snapshot(path, day):
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return {"date": day.isoformat(), "repos": {}}


def _write_snapshot(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")


def collect(http, watchlist, queries, limit, out_dir, today):
    candidates = list(watchlist)
    for name in search_candidates(http, queries, limit) if queries else []:
        if name not in candidates:
            candidates.append(name)
    entries = {}
    for name in candidates:
        entry = fetch_repo(http, name)
        if entry is not None:
            entries[name] = entry
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{today.isoformat()}.json"
    data = _read_snapshot(path, today)
    data["repos"].update(entries)
    _write_snapshot(path, data)
    return path


def _starred_dates(http, repo, total, since):
    """Star dates newer than `since`, reading stargazer pages from the newest backwards."""
    dates = []
    headers = {"Accept": "application/vnd.github.star+json"}
    for page in range(max(1, math.ceil(total / 100)), 0, -1):
        status, body = _get(http, f"{API}/repos/{repo}/stargazers?per_page=100&page={page}", headers)
        if status != 200:
            raise RuntimeError(f"GitHub returned {status} for stargazers of {repo}")
        page_dates = [date.fromisoformat(item["starred_at"][:10]) for item in body]
        dates.extend(page_dates)
        if page_dates and min(page_dates) < since:
            break
    return dates


def backfill(http, repos, out_dir, today, days=90):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    since = today - timedelta(days=days)
    for repo in repos:
        entry = fetch_repo(http, repo)
        if entry is None:
            continue
        total = entry["stars"]
        starred = _starred_dates(http, repo, total, since)
        for offset in range(days, 0, -1):
            day = today - timedelta(days=offset)
            path = out_dir / f"{day.isoformat()}.json"
            data = _read_snapshot(path, day)
            if repo not in data["repos"]:
                data["repos"][repo] = {"stars": total - sum(1 for d in starred if d > day)}
                _write_snapshot(path, data)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--backfill", action="store_true")
    parser.add_argument("--limit", type=int, default=60)
    parser.add_argument("--out", default=str(BASE_DIR / "data" / "snapshots"))
    parser.add_argument("--watchlist", default=str(Path(__file__).resolve().parent / "watchlist.json"))
    args = parser.parse_args()
    today = date.today()
    watchlist = json.loads(Path(args.watchlist).read_text(encoding="utf-8"))["repos"]
    if args.backfill:
        backfill(default_http, watchlist, args.out, today)
        return
    since = (today - timedelta(days=RECENT_DAYS)).isoformat()
    queries = [f"topic:{topic} created:>{since}" for topic in TOPICS]
    collect(default_http, watchlist, queries, args.limit, args.out, today)


if __name__ == "__main__":
    main()
