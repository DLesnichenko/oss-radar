# OSS Radar

Открытый дашборд быстрорастущих проектов GitHub: рейтинг, вертикальные агенты, сегменты и динамика за 90 дней. Без входа и пароля. Это статичный сайт (HTML + JS), данные обновляет ежедневный сборщик на Python.

> Файл `data/radar.json` в репозитории сначала содержит **демо-данные** (проекты `demo/*`). Первый запуск сборщика заменяет их настоящими.

## Как это устроено

```
collector/collect.py   GitHub API -> data/snapshots/ГГГГ-ММ-ДД.json   (снимок звёзд за день)
collector/purpose.py   README -> data/purposes.json                   (необязательно, нужен ключ Claude API)
collector/build.py     снимки -> data/radar.json                      (рост, ускорение, статусы, категории)
index.html + assets/   читают только data/radar.json
```

Рост считается по собственным ежедневным снимкам, поэтому окно в 90 дней заполняется постепенно. Чтобы получить историю сразу, один раз запустите восстановление (только для проектов из `collector/watchlist.json`).

## Запуск у себя

Нужен Python 3.10+ (только стандартная библиотека) и Node 20+ для тестов интерфейса. Команды выполняйте из папки `github_trend_radar/`. На Windows вместо `python` может понадобиться `py -3.10`.

```
python -m collector.collect               # снимок на сегодня (GITHUB_TOKEN повышает лимит API)
python -m collector.collect --backfill    # восстановить последние 90 дней для списка наблюдения
python -m collector.purpose               # описания через Claude API (нужен ANTHROPIC_API_KEY)
python -m collector.build                 # собрать data/radar.json
python -m http.server 8000                # открыть http://localhost:8000/
```

Страницу нельзя открывать двойным кликом (`file://`): браузер не даст загрузить `data/radar.json`.

Демо-данные для работы над интерфейсом: `python -m tests.make_sample`.

## Тесты

```
python -m unittest discover -s tests -t .
node --test tests/logic.test.mjs
```

## Настройка

- `collector/watchlist.json` — ваш ручной список репозиториев (`"владелец/имя"`). Несуществующие репозитории пропускаются.
- `collector/categories.json` — ключевые слова для категорий и отраслей.
- Пороги статусов описаны на странице «Методология» и заданы в `collector/metrics.py`.

## Публикация

Репозиторий сайта должен лежать на GitHub с содержимым этой папки в корне. Ежедневное обновление и публикацию на GitHub Pages выполняет `.github/workflows/update.yml`.

1. Создайте репозиторий на GitHub и загрузите в него содержимое `github_trend_radar/`.
2. Settings → Pages → Source: **GitHub Actions**.
3. Необязательно: Settings → Secrets → добавьте `ANTHROPIC_API_KEY`, чтобы описания проектов писал Claude.
4. Actions → «Update radar» → Run workflow, включив `backfill`, чтобы сразу получить историю.
