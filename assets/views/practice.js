import { esc } from "../logic.js";
import { PATHS, pathBlock } from "./prompts.js";

const STEPS = [
  ["Найдите свою задачу", "В рейтинге выберите проект, который упрощает знакомую вам работу: контент, сайт, исследование, продажи или процессы клиента."],
  ["Выберите результат", "Нужна быстрая польза — заберите один скилл. Нужен готовый инструмент — изучите проект и его первый сценарий."],
  ["Работайте в своём инструменте", "Claude и Codex — два равноправных пути. Выбирайте только тот, которым вы уже пользуетесь."],
];

export function renderPractice({ state, all }) {
  const project = all.some((p) => p.repo === state.selected) ? state.selected : "";
  const chosen = project
    ? `Промпты ниже подставлены для проекта <b>${esc(project)}</b>. Выбрать другой можно во вкладке «Рейтинг проектов».`
    : "Выберите проект во вкладке «Рейтинг проектов» — его название подставится в промпты. Пока в них стоит заглушка.";
  return `<section class="panel hero-card">
      <p class="eyebrow-s">Для начинающих</p>
      <h2 class="h2">От тренда к полезному результату</h2>
      <p class="muted lead">Выберите проект из радара и решите: забрать из него один готовый скилл или освоить весь инструмент для себя, команды или клиента.</p>
    </section>
    <div class="three-col">${STEPS.map(([title, text], i) => `<div class="panel"><span class="num">${i + 1}</span><h3>${esc(title)}</h3><p class="muted small">${esc(text)}</p></div>`).join("")}</div>
    <div class="callout warn"><b>Важно:</b> звёзды GitHub показывают внимание, а не выручку, качество или гарантию спроса. Перед запуском проверьте, есть ли у людей реальная задача.</div>
    <p class="muted">${chosen}</p>
    ${PATHS.map((path) => pathBlock(path, project)).join("")}`;
}
