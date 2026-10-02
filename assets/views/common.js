// HTML fragments shared by several tabs. Every dynamic string goes through esc().
import { esc, fmt, fmtX } from "../logic.js";

export const METRICS = [
  { key: "growth7", label: "Рост за 7 дней", short: "звёзд за 7 дней", hint: "Сколько звёзд проект набрал за последние 7 дней." },
  { key: "growth30", label: "Рост за 30 дней", short: "звёзд за 30 дней", hint: "Сколько звёзд проект набрал за последние 30 дней." },
  { key: "growth90", label: "Рост за 90 дней", short: "звёзд за 90 дней", hint: "Сколько звёзд проект набрал за последние 90 дней. У проектов моложе 90 дней — все их звёзды." },
  { key: "acceleration", label: "Ускорение", short: "ускорение", hint: "Рост за последние 30 дней, делённый на рост за предыдущие 30. Больше 1 — темп растёт." },
  { key: "stars", label: "Всего звёзд", short: "всего звёзд", hint: "Все звёзды проекта на дату замера." },
];

export const STATUS_CLASS = {
  "ускоряется": "s-up",
  "устойчивый рост": "s-steady",
  "рост без ускорения": "s-flat",
  "замедляется": "s-down",
};

export function hint(text) {
  return `<span class="hint" tabindex="0" role="note" title="${esc(text)}" aria-label="${esc(text)}">?</span>`;
}

export function formatMetric(p, key) {
  const v = p[key];
  if (v == null) return "н/д";
  if (key === "acceleration") return fmtX(v);
  if (key === "stars") return `${fmt(v)} ★`;
  return `${v > 0 ? "+" : ""}${fmt(v)} ★`;
}

export function statusBadge(status) {
  if (!status) return `<span class="badge s-none">н/д</span>`;
  return `<span class="badge ${STATUS_CLASS[status] ?? "s-none"}">${esc(status)}</span>`;
}

export function seenTag(p, date) {
  return p.first_seen === date ? "Впервые в радаре" : "Был в радаре";
}

export function emptyState() {
  return `<div class="panel empty"><p>Ничего не найдено. Измените запрос или сбросьте фильтры.</p>
    <button class="btn ghost" data-action="reset">Сбросить фильтры</button></div>`;
}

export function rankedList(items, metricKey, selectedRepo, date) {
  const values = items.map((p) => p[metricKey]).filter((v) => v != null && v > 0);
  const max = values.length ? Math.max(...values) : 1;
  const rows = items.map((p, i) => {
    const v = p[metricKey];
    const width = v != null && v > 0 ? Math.max(2, (v / max) * 100) : 0;
    const meta = [p.industry || p.category, p.language, seenTag(p, date)].filter(Boolean).map(esc).join(" · ");
    return `<button class="row${p.repo === selectedRepo ? " selected" : ""}" data-set-key="selected" data-set-value="${esc(p.repo)}">
      <span class="rank">${i + 1}</span>
      <span class="who"><b>${esc(p.repo)}</b><small>${meta}</small></span>
      <span class="bar" aria-hidden="true"><i style="width:${width.toFixed(1)}%"></i></span>
      <span class="val">${formatMetric(p, metricKey)}</span>
    </button>`;
  });
  return `<div class="panel list">${rows.join("")}</div>`;
}

function insight(p) {
  if (p.acceleration != null && p.acceleration >= 1.5) {
    return `Сильный текущий сигнал: темп роста за последний месяц выше предыдущего примерно в ${p.acceleration.toFixed(1).replace(".", ",")} раза.`;
  }
  if (p.status === "ускоряется" && p.acceleration == null) {
    return "Проект появился недавно: истории для сравнения с прошлым месяцем пока нет.";
  }
  return "";
}

export function detailCard(p, date, { eyebrow, task } = {}) {
  const note = insight(p);
  const safeUrl = typeof p.url === "string" && p.url.startsWith("https://github.com/") ? p.url : "";
  return `<aside class="panel detail">
    <p class="eyebrow-s">${esc(eyebrow ?? p.category)}</p>
    <h2>${esc(p.repo)}</h2>
    <p>${statusBadge(p.status)} <span class="muted">${esc(seenTag(p, date))}</span></p>
    ${task ? `<h3>Какую отраслевую задачу решает</h3><div class="callout">${esc(task)}</div>` : ""}
    <h3>Для чего нужен</h3>
    <p>${esc(p.purpose) || '<span class="muted">Описание отсутствует.</span>'}</p>
    ${note ? `<div class="callout">${esc(note)}</div>` : ""}
    <div class="stats">
      <div class="stat"><small>Звёзд сейчас</small><b>${fmt(p.stars)}</b></div>
      <div class="stat"><small>Рост за 7 дней</small><b>${formatMetric(p, "growth7")}</b></div>
      <div class="stat"><small>Рост за 30 дней</small><b>${formatMetric(p, "growth30")}</b></div>
      <div class="stat"><small>Рост за 90 дней</small><b>${formatMetric(p, "growth90")}</b></div>
      <div class="stat"><small>Ускорение ${hint(METRICS[3].hint)}</small><b>${fmtX(p.acceleration)}</b></div>
      <div class="stat"><small>Активных дней из 30</small><b>${p.active_days}</b></div>
    </div>
    ${safeUrl ? `<a class="btn" href="${esc(safeUrl)}" target="_blank" rel="noopener noreferrer">Открыть на GitHub ↗</a>` : ""}
  </aside>`;
}

export function selectOptions(options, current) {
  return options
    .map(([value, label]) => `<option value="${esc(value)}"${value === current ? " selected" : ""}>${esc(label)}</option>`)
    .join("");
}

export const TOP_N_OPTIONS = [["10", "ТОП-10"], ["15", "ТОП-15"], ["25", "ТОП-25"], ["all", "Все"]];

export function takeTop(ranked, topN) {
  return topN === "all" ? ranked : ranked.slice(0, Number(topN) || 15);
}
