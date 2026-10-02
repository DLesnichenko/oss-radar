"""Optional one-line "what is it for" texts written by Claude from the README.

Without ANTHROPIC_API_KEY nothing is called and the repo description is used.
Usage (from github_trend_radar/): py -3.10 -m collector.purpose
"""
import base64
import json
import os
import urllib.request
from pathlib import Path

from collector import collect

MODEL = "claude-haiku-4-5-20251001"
MESSAGES_URL = "https://api.anthropic.com/v1/messages"
README_CHARS = 6000
PROMPT = (
    "Ниже README open-source проекта. Одним предложением на русском (до 200 символов) "
    "объясни, для чего он нужен человеку, не знакомому с проектом. Только предложение, "
    "без кавычек и вступления.\n\nПроект: {repo}\n\nREADME:\n{readme}"
)


def default_post(url, headers, payload):
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"content-type": "application/json", **headers},
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read())


def purpose_for(repo, description, readme, api_key, post, cache):
    if repo in cache:
        return cache[repo]
    fallback = description or ""
    if not api_key or not readme:
        return fallback
    payload = {
        "model": MODEL,
        "max_tokens": 200,
        "messages": [
            {"role": "user", "content": PROMPT.format(repo=repo, readme=readme[:README_CHARS])}
        ],
    }
    headers = {"x-api-key": api_key, "anthropic-version": "2023-06-01"}
    try:
        text = post(MESSAGES_URL, headers, payload)["content"][0]["text"].strip()
    except Exception:
        return fallback
    if not text:
        return fallback
    cache[repo] = text
    return text


def _readme(http, repo):
    status, body, _ = http(f"{collect.API}/repos/{repo}/readme", {})
    if status != 200 or body.get("encoding") != "base64":
        return None
    return base64.b64decode(body["content"]).decode("utf-8", errors="replace")


def update_purposes(http, post, repos, api_key, path):
    """repos: {full name: description}. Adds purposes for repos not yet in the file."""
    if not api_key:
        return
    path = Path(path)
    cache = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    for repo, description in repos.items():
        if repo not in cache:
            purpose_for(repo, description, _readme(http, repo), api_key, post, cache)
    path.write_text(json.dumps(cache, ensure_ascii=False, indent=1), encoding="utf-8")


def main():
    base = Path(__file__).resolve().parent.parent
    snapshots = sorted((base / "data" / "snapshots").glob("*.json"))
    if not snapshots:
        return
    repos = json.loads(snapshots[-1].read_text(encoding="utf-8"))["repos"]
    descriptions = {name: entry.get("description") for name, entry in repos.items()}
    update_purposes(
        collect.default_http,
        default_post,
        descriptions,
        os.environ.get("ANTHROPIC_API_KEY"),
        base / "data" / "purposes.json",
    )


if __name__ == "__main__":
    main()
