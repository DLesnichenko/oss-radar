import { rankBy, plural, effectiveMetric } from "../logic.js";
import {
  METRICS, hint, emptyState, noDataNotice, rankedList, detailCard, selectOptions, TOP_N_OPTIONS, takeTop,
} from "./common.js";

export function renderRating({ state, projects, date }) {
  const requested = METRICS.find((m) => m.key === state.metric) ?? METRICS[1];
  const pills = METRICS.map(
    (m) => `<span><button class="pill" aria-pressed="${m.key === requested.key}" data-set-key="metric" data-set-value="${m.key}">${m.label}</button>${hint(m.hint)}</span>`,
  ).join("");
  const controls = `<div class="controls">
    <div class="pills">${pills}</div>
    <label class="inline-field">Показывать
      <select data-key="topN">${selectOptions(TOP_N_OPTIONS, state.topN)}</select></label>
  </div>`;
  if (!projects.length) return controls + emptyState();

  const metric = METRICS.find((m) => m.key === effectiveMetric(projects, requested.key));
  const ranked = rankBy(projects, metric.key);
  const top = takeTop(ranked, state.topN);
  const selected = top.find((p) => p.repo === state.selected) ?? top[0];
  return `${controls}${noDataNotice(requested.key, metric.key)}
    <p class="muted">Найдено ${projects.length} ${plural(projects.length, ["проект", "проекта", "проектов"])} · рейтинг по показателю «${metric.short}»</p>
    <div class="split">${rankedList(top, metric.key, selected.repo, date)}${detailCard(selected, date)}</div>`;
}
