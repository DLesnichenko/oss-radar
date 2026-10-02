// Copyable prompt cards shared by the Practice tab and the project detail card.
import { esc, fillPrompt } from "../logic.js";

export const PATHS = [
  {
    id: "skill",
    label: "Путь 1",
    title: "Забрать скилл",
    lead: "Скилл — готовая повторяемая инструкция для одной задачи. Это самый быстрый первый результат: вы проверяете её на своей работе и сохраняете удачную версию.",
    steps: [
      "Найдите в проекте одно действие: исследование, сценарий, проверку сайта или сбор требований.",
      "Опишите вход и результат: что вы даёте и что хотите получить.",
      "Проверьте инструкцию на одной настоящей задаче и сохраните рабочий вариант.",
    ],
    tools: [
      {
        name: "Claude", tone: "claude", title: "Понять и собрать скилл",
        about: "Попросите выделить одно полезное действие и превратить его в понятную инструкцию для вашей ниши.",
        prompt: "Я изучаю {project}. Выдели один полезный повторяемый навык для моей задачи и объясни, как превратить его в готовую инструкцию: входные данные, шаги и ожидаемый результат.",
      },
      {
        name: "Codex", tone: "codex", title: "Проверить скилл на деле",
        about: "Попросите превратить подход из README в минимальный рабочий шаблон без лишних частей проекта.",
        prompt: "Я изучаю {project}. По README выдели один повторяемый навык для моей задачи. Составь минимальный рабочий шаблон и объясни, как проверить его на одном реальном примере.",
      },
    ],
  },
  {
    id: "project",
    label: "Путь 2",
    title: "Освоить проект",
    lead: "Если репозиторий уже решает вашу задачу целиком, его можно взять как инструмент. Понимать весь код не нужно: начните с одного понятного сценария.",
    steps: [
      "Поймите, что проект делает и кому он полезен: вам, команде или клиенту.",
      "Откройте README и отметьте минимум для старта: аккаунт, ключ, установку или веб-интерфейс.",
      "Выберите первый результат на 15–30 минут: один сценарий, а не все функции сразу.",
    ],
    tools: [
      {
        name: "Claude", tone: "claude", title: "Разобраться до запуска",
        about: "Попросите перевести README с технического языка на язык задач и составить короткий план первого сценария.",
        prompt: "Объясни простыми словами, что делает {project} и кому он может быть полезен. По README назови минимум для запуска и предложи один первый сценарий на 30 минут для моей задачи.",
      },
      {
        name: "Codex", tone: "codex", title: "Собрать минимум",
        about: "Дайте README или локальную папку и попросите не усложнять первый запуск дополнительными функциями.",
        prompt: "Я хочу освоить {project} для моей задачи. По README составь минимальный план запуска и первый сценарий на 30 минут. Перечисли только обязательные шаги и не добавляй лишние функции.",
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

export function pathBlock(path, project, { compact = false } = {}) {
  const steps = compact
    ? ""
    : `<ol class="steps">${path.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>`;
  return `<section class="${compact ? "path path-compact" : "panel path"}">
    <p class="eyebrow-s">${esc(path.label)}</p>
    <h3>${esc(path.title)}</h3>
    ${compact ? "" : `<p class="muted small">${esc(path.lead)}</p>`}
    ${steps}
    <p class="pick">Выберите один инструмент, которым уже пользуетесь.</p>
    <div class="tools">${path.tools.map((t) => toolCard(t, project, compact)).join("")}</div>
  </section>`;
}
