"""Keyword-based categories and industries for repositories."""
import json

VERTICAL = "Вертикальные агенты"
OTHER = "Прочее"


def load_rules(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _text(repo):
    parts = [repo.get("name") or "", repo.get("description") or ""]
    parts.extend(repo.get("topics") or [])
    return " ".join(parts).lower()


def _first_match(text, groups):
    for group in groups:
        if any(keyword in text for keyword in group["keywords"]):
            return group["name"]
    return None


def industry_of(repo, rules):
    return _first_match(_text(repo), rules["industries"])


def category_of(repo, rules):
    if industry_of(repo, rules):
        return VERTICAL
    return _first_match(_text(repo), rules["categories"]) or OTHER
