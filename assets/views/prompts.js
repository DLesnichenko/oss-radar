// Copyable prompt cards shared by the Practice tab and the project detail card.
import { esc, fillPrompt } from "../logic.js";

export const PATHS = [
  {
    id: "skill",
    label: "Путь 1",
    title: "Забрать скилл",
    lead: "Скилл — готовая повторяемая инструкция для одной задачи. Это самый быстрый первый результат: ты проверяешь её на своей работе и сохраняешь удачную версию.",
    shortLead: ({ category }) => `Выдели одно повторяемое действие из подхода «${category}» и преврати его в инструкцию для своей задачи.`,
    steps: [
      "Найди в проекте одно действие: исследование, сценарий, проверку сайта или сбор требований.",
      "Опиши вход и результат: что ты даёшь и что хочешь получить.",
      "Проверь инструкцию на одной настоящей задаче и сохрани рабочий вариант.",
    ],
    tools: [
      {
        name: "Claude", tone: "claude", title: "Понять и собрать скилл",
        about: "Попроси выделить одно полезное действие и превратить его в понятную инструкцию для твоей ниши.",
        prompt: "Я изучаю {project}. Выдели один полезный повторяемый навык для моей задачи и объясни, как превратить его в готовую инструкцию: входные данные, шаги и ожидаемый результат.",
      },
      {
        name: "Codex", tone: "codex", title: "Проверить скилл на деле",
        about: "Попроси превратить подход из README в минимальный рабочий шаблон без лишних частей проекта.",
        prompt: "Я изучаю {project}. По README выдели один повторяемый навык для моей задачи. Составь минимальный рабочий шаблон и объясни, как проверить его на одном реальном примере.",
      },
    ],
  },
  {
    id: "project",
    label: "Путь 2",
    title: "Освоить проект",
    lead: "Если репозиторий уже решает твою задачу целиком, его можно взять как инструмент. Понимать весь код не нужно: начни с одного понятного сценария.",
    shortLead: ({ project }) => `Если ${project} решает твою задачу целиком, начни с README и одного результата, который можно получить за 15–30 минут.`,
    steps: [
      "Пойми, что проект делает и кому он полезен: тебе, команде или клиенту.",
      "Открой README и отметь минимум для старта: аккаунт, ключ, установку или веб-интерфейс.",
      "Выбери первый результат на 15–30 минут: один сценарий, а не все функции сразу.",
    ],
    tools: [
      {
        name: "Claude", tone: "claude", title: "Разобраться до запуска",
        about: "Попроси перевести README с технического языка на язык задач и составить короткий план первого сценария.",
        prompt: "Объясни простыми словами, что делает {project} и кому он полезен. По README назови минимум для запуска и один первый сценарий на 30 минут для моей задачи.",
      },
      {
        name: "Codex", tone: "codex", title: "Собрать минимум",
        about: "Дай README или локальную папку и попроси не усложнять первый запуск дополнительными функциями.",
        prompt: "Я хочу освоить {project} для моей задачи. По README составь минимальный план запуска и первый сценарий на 30 минут. Перечисли только обязательные шаги.",
      },
    ],
  },
];

function copyButton(text) {
  return `<button class="btn ghost" data-copy="${esc(text)}">Скопировать</button>`;
}

function toolCard(tool, project, compact) {
  const text = fillPrompt(tool.prompt, project);
  return `<div class="tool tool-${tool.tone}">
    <p class="eyebrow-s">${esc(tool.name)}</p>
    ${compact ? "" : `<h4>${esc(tool.title)}</h4><p class="muted small">${esc(tool.about)}</p>`}
    <pre>${esc(text)}</pre>${copyButton(text)}
  </div>`;
}

export function pathBlock(path, project, { compact = false, category = "" } = {}) {
  const steps = compact
    ? ""
    : `<ol class="steps">${path.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>`;
  const lead = compact ? path.shortLead({ project, category }) : path.lead;
  const heading = compact ? "h4" : "h3";
  return `<section class="${compact ? "path path-compact" : "panel path"}">
    <p class="eyebrow-s">${esc(path.label)}</p>
    <${heading}>${esc(path.title)}</${heading}>
    <p class="muted small">${esc(lead)}</p>
    ${steps}
    <p class="pick">Выбери только один инструмент, которым уже пользуешься.</p>
    <div class="tools">${path.tools.map((t) => toolCard(t, project, compact)).join("")}</div>
  </section>`;
}
