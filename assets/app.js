import { esc, fmtDate, filterProjects, parseState, serializeState, validFilters } from "./logic.js";
import { hint, selectOptions } from "./views/common.js";
import { renderRating } from "./views/rating.js";
import { renderVertical } from "./views/vertical.js";
import { renderSegments } from "./views/segments.js";
import { renderPractice } from "./views/practice.js";
import { renderMethodology } from "./views/methodology.js";

const TABS = [
  ["practice", "Практика: скилл или проект"],
  ["rating", "Рейтинг проектов"],
  ["vertical", "Вертикальные агенты"],
  ["segments", "Сегменты и динамика"],
];
const METHOD_TAB = ["method", "Методология"];
const VIEWS = {
  practice: renderPractice, rating: renderRating, vertical: renderVertical, segments: renderSegments,
  method: renderMethodology,
};
const SHARED_FILTERS = ["category", "status", "language", "query"];
const CATEGORY_ORDER = [
  "Оркестрация агентов", "Навыки и методологии", "Контент и дизайн", "Экономия и контекст",
  "Веб и инструменты", "Вертикальные агенты", "Прочее",
];
const STATUS_ORDER = ["ускоряется", "устойчивый рост", "рост без ускорения", "замедляется"];
const BASE_DEFAULTS = {
  tab: "rating", date: "", category: "", status: "", language: "", query: "",
  metric: "growth30", topN: "15", selected: "", industry: "", criterion: "category",
};

const $ = (id) => document.getElementById(id);
let data;
let defaults;
let state;

function showProblem(html) {
  $("filters").hidden = true;
  $("view").innerHTML = `<div class="error">${html}</div>`;
}

async function load() {
  try {
    const response = await fetch("data/radar.json", { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    showProblem(`<b>Не удалось загрузить data/radar.json.</b><br>Если вы открыли файл напрямую (file://), запустите локальный сервер: <code>py -3.10 -m http.server</code>. (${esc(err.message)})`);
    return null;
  }
}

function normalise(s) {
  if (!data.by_date[s.date]) s.date = data.dates[0];
  if (![...TABS, METHOD_TAB].some(([id]) => id === s.tab)) s.tab = defaults.tab;
  return Object.assign(s, validFilters(s, data.by_date[s.date].projects));
}

function entry() {
  return data.by_date[state.date];
}

function sync() {
  history.replaceState(null, "", "#" + serializeState(state, defaults));
  renderTabs();
  renderStamp();
  $("filters").hidden = state.tab === METHOD_TAB[0];
  renderView();
}

function renderTabs() {
  const button = ([id, label]) =>
    `<button data-set-key="tab" data-set-value="${id}"${id === state.tab ? ' aria-current="page"' : ""}>${esc(label)}</button>`;
  $("tabs").innerHTML = TABS.map(button).join("") + `<span class="spacer"></span>` + button(METHOD_TAB);
}

function renderStamp() {
  const { window: w } = entry();
  $("stamp").innerHTML = `<small>Замер</small><b>${fmtDate(state.date)}</b><small>${w.from} — ${w.to}</small>`;
}

function renderFilters() {
  const projects = entry().projects;
  const present = new Set(projects.map((p) => p.category));
  const categories = CATEGORY_ORDER.filter((c) => present.has(c));
  const statuses = STATUS_ORDER;
  const languages = [...new Set(projects.map((p) => p.language).filter(Boolean))].sort();
  const all = (label) => ["", label];
  const field = (label, control, tip) =>
    `<div class="field"><label>${label}${tip ? hint(tip) : ""}</label>${control}</div>`;
  const select = (key, options) =>
    `<select data-key="${key}">${selectOptions(options, state[key])}</select>`;

  $("filters").innerHTML =
    field("Дата замера", select("date", data.dates.map((d) => [d, fmtDate(d)]))) +
    field("Тренд", select("category", [all("Все тренды"), ...categories.map((c) => [c, c])]),
      "Категория проекта. Это собственная разметка радара по описанию и темам репозитория, а не метка GitHub.") +
    field("Статус", select("status", [all("Все статусы"), ...statuses.map((s) => [s, s])]),
      "Динамика роста: ускоряется — темп за 30 дней в 1,5 раза выше предыдущего месяца и больше; замедляется — меньше 0,4.") +
    field("Язык", select("language", [all("Все языки"), ...languages.map((l) => [l, l])]),
      "Основной язык репозитория по данным GitHub.") +
    field("Поиск", `<input type="search" data-key="query" placeholder="Название или описание" value="${esc(state.query)}">`);
}

function renderView() {
  const render = VIEWS[state.tab];
  if (!render) {
    $("view").innerHTML = `<div class="panel empty">Раздел в разработке.</div>`;
    return;
  }
  const filters = Object.fromEntries(SHARED_FILTERS.map((k) => [k, state[k]]));
  const projects = filterProjects(entry().projects, filters);
  $("view").innerHTML = render({ state, projects, all: entry().projects, entry: entry(), date: state.date });
}

function set(key, value) {
  state[key] = value;
  if (key === "date") {
    state.selected = "";
    Object.assign(state, validFilters(state, entry().projects));
    renderFilters();
  }
  sync();
  if (key === "selected" || key === "metric" || key === "tab") {
    const el = document.querySelector(`[data-set-key="${key}"][data-set-value="${CSS.escape(value)}"]`);
    el?.focus({ preventScroll: true });
    if (key === "selected" && matchMedia("(max-width: 900px)").matches) {
      document.querySelector(".detail")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }
}

function resetFilters() {
  for (const key of [...SHARED_FILTERS, "industry"]) state[key] = defaults[key];
  renderFilters();
  sync();
}

function legacyCopy(text) {
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}

async function copyPrompt(button) {
  let ok = true;
  try {
    await navigator.clipboard.writeText(button.dataset.copy);
  } catch {
    ok = legacyCopy(button.dataset.copy);
  }
  button.textContent = ok ? "Скопировано" : "Не удалось скопировать";
  setTimeout(() => { button.textContent = "Скопировать"; }, 1600);
}

document.addEventListener("click", (event) => {
  const copy = event.target.closest("[data-copy]");
  if (copy) return copyPrompt(copy);
  const setter = event.target.closest("[data-set-key]");
  if (setter) return set(setter.dataset.setKey, setter.dataset.setValue);
  if (event.target.closest('[data-action="reset"]')) resetFilters();
});
document.addEventListener("change", (event) => {
  if (event.target.matches("select[data-key]")) set(event.target.dataset.key, event.target.value);
});
document.addEventListener("input", (event) => {
  if (event.target.matches('input[data-key="query"]')) set("query", event.target.value);
});
window.addEventListener("hashchange", () => {
  state = normalise(parseState(location.hash, defaults));
  renderFilters();
  sync();
});

data = await load();
if (data) {
  if (!data.dates?.length) {
    showProblem("<b>Данных пока нет.</b> Первый снимок появится после первого запуска сборщика.");
  } else {
    defaults = { ...BASE_DEFAULTS, date: data.dates[0] };
    state = normalise(parseState(location.hash, defaults));
    renderFilters();
    sync();
  }
}
