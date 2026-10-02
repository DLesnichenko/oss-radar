import { esc, fmt, rankBy, verticalKpis, effectiveMetric } from "../logic.js";
import {
  emptyState, noDataNotice, rankedList, detailCard, selectOptions, TOP_N_OPTIONS, takeTop,
} from "./common.js";

const INDUSTRY_TASKS = {
  "Кибербезопасность": "Проверка защищённости, поиск угроз и применение отраслевых фреймворков.",
  "Контент и медиа": "Создание, монтаж и обработка видео, аудио и других медиа без ручной рутины.",
  "Карьера и HR": "Поиск вакансий, подготовка резюме и сопровождение найма.",
  "Маркетинг и продажи": "Исследование аудитории, подготовка кампаний и работа с воронкой продаж.",
  "Финансы": "Анализ рынков, учёт и обработка финансовых документов.",
  "Разработка": "Ревью кода, автоматизация сборки и сопровождение процессов разработки.",
};

function tile(label, value) {
  return `<div class="panel tile"><small>${label}</small><b>${value}</b></div>`;
}

export function renderVertical({ state, projects, all, date }) {
  const industries = [...new Set(all.map((p) => p.industry).filter(Boolean))].sort();
  const header = `<div class="controls">
    <div>
      <p class="eyebrow-s">Отдельный рыночный срез</p>
      <h2 class="h2">Вертикальные агенты</h2>
      <p class="muted lead">Специализированные AI-решения для конкретной профессии или отрасли. Показатели всех проектов пересчитаны на дату замера.</p>
    </div>
    <div class="inline-fields">
      <label class="inline-field">Отрасль
        <select data-key="industry">${selectOptions([["", "Все отрасли"], ...industries.map((i) => [i, i])], state.industry)}</select></label>
      <label class="inline-field">Показывать
        <select data-key="topN">${selectOptions(TOP_N_OPTIONS, state.topN)}</select></label>
    </div>
  </div>
  <div class="panel explainer">
    <h3>Что значит «вертикальные агенты»</h3>
    <p><b>Вертикаль</b> — отдельная отрасль или профессиональная область: финансы, маркетинг, HR, кибербезопасность. Вертикальный AI-агент специализируется на задачах одной такой области и знает её рабочий процесс. Этим он отличается от универсального агента общего назначения.</p>
    <p class="muted small">В этом дашборде «Вертикальные агенты» — наша аналитическая категория, сформированная по описанию и темам проекта. Это не официальная метка GitHub.</p>
  </div>`;

  const vertical = projects.filter((p) => p.industry && (!state.industry || p.industry === state.industry));
  if (!vertical.length) return header + emptyState();

  const kpi = verticalKpis(vertical);
  const tiles = `<div class="tiles">
    ${tile("Вертикальных проектов", fmt(kpi.count))}
    ${tile("Отраслей", fmt(kpi.industries))}
    ${tile("Новых звёзд за 30 дней", kpi.growth30 == null ? "н/д" : `+${fmt(kpi.growth30)}`)}
    ${tile("Лидер текущего месяца", kpi.leader ? esc(kpi.leader) : "н/д")}
  </div>`;

  const metricKey = effectiveMetric(vertical, "growth30");
  const top = takeTop(rankBy(vertical, metricKey), state.topN);
  const selected = top.find((p) => p.repo === state.selected) ?? top[0];
  return `${header}${tiles}${noDataNotice("growth30", metricKey)}<div class="split">${rankedList(top, metricKey, selected.repo, date)}${detailCard(selected, date, {
    eyebrow: selected.industry,
    task: INDUSTRY_TASKS[selected.industry],
  })}</div>`;
}
