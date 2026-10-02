# OSS Radar — design

> **Note:** written before the project moved to its own repository. Paths starting with `github_trend_radar/` refer to the root of this repository.

## Goal
A public, login-free dashboard of fast-growing open-source GitHub projects, modelled on the structure of the GitHub Trend Radar dashboard (4 tabs, shared filters, ranking, segments), with its own visual identity. Data comes from the live GitHub API and refreshes daily without a server.

## Decisions (agreed with the user)
- Access: fully open, no password, no "Выйти" button.
- Data: live GitHub API + automatic categorisation (not demo data, not a hand-kept list only).
- Hosting: GitHub Actions (daily cron) + GitHub Pages. Needs its own GitHub repo; the project lives in `github_trend_radar/` here and is published from there.
- Differentiation: dark theme with cyan accents, matching the visitka / DBA911 sites; own name and header ("OSS Radar"; working name, easy to change).
- Not in v1: auth, accounts, notifications, project comparison, favourites.

## Layout
```
github_trend_radar/
  index.html, assets/        # vanilla HTML/CSS/JS, SVG charts, no build step
  data/snapshots/YYYY-MM-DD.json   # daily raw snapshot: repo -> stars, meta
  data/radar.json                  # computed slice consumed by the UI
  collector/collect.py       # GitHub API -> snapshot
  collector/build.py         # snapshots -> radar.json
  collector/watchlist.json   # manual repo list
  collector/categories.json  # topic/keyword -> category rules
  .github/workflows/update.yml
```
The UI reads only `radar.json`; collector and UI are coupled solely by that file's format.

## Collector
1. `collect.py`: candidates = GitHub search (topics/keywords such as agent, skill, mcp) ∪ `watchlist.json`. For each: stars, language, description, topics. Writes one snapshot per day.
2. `build.py`: from snapshots computes growth over 7/30/90 days, acceleration (growth of last 30 days ÷ previous 30), active days. Assigns status (ускоряется / устойчивый рост / рост без ускорения / замедляется) by acceleration thresholds, category by `categories.json` rules, industry for the vertical-agents tab. Writes `radar.json`.
3. "Для чего нужен" text: repo description; if secret `ANTHROPIC_API_KEY` is set, rewritten from the README via the Claude API. Works without the key.
4. `--backfill`: one-off, restores star dates (stargazers API with `star+json`) for watchlist projects only, to avoid rate limits, so early growth figures are not empty. Without it, 7/30/90-day metrics fill in as snapshots accumulate; the UI shows "н/д" for windows not yet covered.

## UI
- Tabs: Практика, Рейтинг проектов, Вертикальные агенты, Сегменты и динамика, plus a Методология page (how metrics are computed; stars measure attention, not demand).
- Shared filters across tabs: snapshot date, trend (category), status, language, search.
- Рейтинг: metric switch (7d / 30d / 90d growth, acceleration, total stars), top-N selector, bar rows, detail card (stars now, growth, acceleration, active days, purpose, GitHub link, copyable Claude/Codex prompts).
- Вертикальные агенты: industry filter, KPI tiles, ranking, detail card.
- Сегменты и динамика: distribution bars by criterion, weekly stars line chart (SVG), summary table.
- Практика: two paths (take a skill / adopt a project) with copy-to-clipboard prompts for Claude and Codex.
- Style: dark background, cyan accent, own header. Responsive; chart labels must not overlap (the original's x-axis dates do).

## Testing
- `build.py`: unit tests on fixed snapshots — growth windows, acceleration, status thresholds, repo younger than 90 days, missing snapshot days, zero previous-period growth (no division by zero).
- UI: run locally against a test `radar.json`, check every tab, every filter, empty-result state, and narrow viewport.

## Risks
- GitHub API rate limits: use token in Actions (`GITHUB_TOKEN`), cap candidate count, backfill only for watchlist.
- Categorisation by rules is approximate; the methodology page says the categories are our own analytical labels, not GitHub's.
