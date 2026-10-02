import { esc, fmt, fmtX, fmtDate, plural, segments, weeklyTotals, chartPoints, splitRuns } from "../logic.js";
import { emptyState, selectOptions } from "./common.js";

const CRITERIA = { category: "По трендам", language: "По языкам", status: "По статусам" };
const W = 640;
const H = 260;

function shortDate(iso) {
  const [, m, d] = iso.split("-");
  return `${d}.${m}`;
}

function distribution(rows) {
  const max = Math.max(1, ...rows.map((r) => r.growth30 ?? 0));
  return rows
    .map((r) => {
      const width = r.growth30 ? Math.max(2, (r.growth30 / max) * 100) : 0;
      return `<div class="dist"><div class="dist-head"><span>${esc(r.name)}</span><b>${r.growth30 == null ? "н/д" : `${fmt(r.growth30)} ★`}</b></div>
        <div class="bar"><i style="width:${width.toFixed(1)}%"></i></div></div>`;
    })
    .join("");
}

function weeklyChart(totals) {
  const points = chartPoints(totals.map((t) => t.gain), { width: W, height: H, padX: 34, padTop: 34, padBottom: 40 });
  if (!points.some(Boolean)) {
    return `<p class="muted">Недостаточно истории для графика: нужны ежедневные снимки хотя бы за две недели.</p>`;
  }
  const lines = splitRuns(points)
    .map((run) => `<polyline class="line" points="${run.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ")}"/>`)
    .join("");
  const dots = points
    .map((q) =>
      q
        ? `<circle class="dot" cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="4"/>
           <text class="val-label" x="${q.x.toFixed(1)}" y="${(q.y - 10).toFixed(1)}" text-anchor="middle">${fmt(q.value)}</text>`
        : "",
    )
    .join("");
  const axis = totals
    .map((t, i) => {
      const x = points[i] ? points[i].x : 34 + (i * (W - 68)) / Math.max(1, totals.length - 1);
      return `<text class="axis-label" x="${x.toFixed(1)}" y="${H - 14}" text-anchor="middle">${shortDate(t.week)}</text>`;
    })
    .join("");
  return `<div class="chart-scroll"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Прирост звёзд по неделям" class="chart">
      <line class="base" x1="34" x2="${W - 34}" y1="${H - 40}" y2="${H - 40}"/>${lines}${dots}${axis}</svg></div>`;
}

export function renderSegments({ state, projects, entry, date }) {
  const criterion = CRITERIA[state.criterion] ? state.criterion : "category";
  const head = `<div class="controls">
    <div>
      <h2 class="h2">Накопительная карта рынка</h2>
      <p class="muted">${fmtDate(date)}: ${projects.length} ${plural(projects.length, ["проект", "проекта", "проектов"])} после фильтрации</p>
    </div>
    <label class="inline-field">Критерий
      <select data-key="criterion">${selectOptions(Object.entries(CRITERIA), criterion)}</select></label>
  </div>`;
  if (!projects.length) return head + emptyState();

  const rows = segments(projects, criterion);
  const totals = weeklyTotals(projects, entry.weeks);
  const table = rows
    .map(
      (r) => `<tr><td>${esc(r.name)}</td><td>${r.count}</td><td>${fmt(r.growth30)}</td><td>${fmt(r.growth90)}</td><td>${fmtX(r.avgAcceleration)}</td></tr>`,
    )
    .join("");
  return `${head}
    <div class="two-col">
      <section class="panel"><h3>Распределение проектов</h3><p class="muted small">Звёзд за 30 дней</p>${distribution(rows)}</section>
      <section class="panel"><h3>Динамика по неделям</h3><p class="muted small">Прирост звёзд за неделю у отфильтрованных проектов</p>${weeklyChart(totals)}</section>
    </div>
    <div class="panel table-wrap"><table>
      <thead><tr><th>Сегмент</th><th>Проектов</th><th>Звёзд +30 дней</th><th>Звёзд +90 дней</th><th>Среднее ускорение</th></tr></thead>
      <tbody>${table}</tbody></table></div>`;
}
