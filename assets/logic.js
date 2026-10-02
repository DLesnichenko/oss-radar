// Pure dashboard logic: no DOM, no fetch. Shared by the page and node tests.

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

export function fmt(n) {
  if (n == null) return "н/д";
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function fillPrompt(template, project) {
  return template.split("{project}").join(project || "[название проекта]");
}

export function plural(n, [one, few, many]) {
  const last = n % 10;
  const lastTwo = n % 100;
  if (last === 1 && lastTwo !== 11) return one;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return few;
  return many;
}

export function fmtX(n) {
  return n == null ? "н/д" : n.toFixed(1).replace(".", ",") + "×";
}

export function fmtDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

// Shareable URL state: only keys present in `defaults` are read or written.
export function parseState(hash, defaults) {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const state = {};
  for (const key of Object.keys(defaults)) state[key] = params.get(key) ?? defaults[key];
  return state;
}

export function serializeState(state, defaults) {
  const params = new URLSearchParams();
  for (const key of Object.keys(defaults)) {
    if (state[key] !== defaults[key]) params.set(key, state[key]);
  }
  return params.toString();
}

export function filterProjects(projects, { category = "", status = "", language = "", query = "" } = {}) {
  const q = query.trim().toLowerCase();
  return projects.filter(
    (p) =>
      (!category || p.category === category) &&
      (!status || p.status === status) &&
      (!language || p.language === language) &&
      (!q || p.repo.toLowerCase().includes(q) || (p.purpose || "").toLowerCase().includes(q)),
  );
}

export function rankBy(projects, metric) {
  return [...projects].sort((a, b) => {
    if (a[metric] == null && b[metric] == null) return 0;
    if (a[metric] == null) return 1;
    if (b[metric] == null) return -1;
    return b[metric] - a[metric];
  });
}

// A total is shown only when at least half of the values are known: a sum over a few
// known projects would pass off partial data as the total for the whole group.
function sumCovered(values) {
  const known = values.filter((v) => v != null);
  return known.length && known.length >= Math.ceil(values.length / 2)
    ? known.reduce((a, b) => a + b, 0)
    : null;
}

export function segments(projects, key = "category") {
  const groups = new Map();
  for (const p of projects) {
    const name = p[key] ?? "Не указан";
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(p);
  }
  const rows = [...groups].map(([name, items]) => {
    const accel = items.map((p) => p.acceleration).filter((v) => v != null);
    return {
      name,
      count: items.length,
      growth30: sumCovered(items.map((p) => p.growth30)),
      growth90: sumCovered(items.map((p) => p.growth90)),
      avgAcceleration: accel.length ? accel.reduce((a, b) => a + b, 0) / accel.length : null,
    };
  });
  return rows.sort((a, b) => (b.growth30 ?? -Infinity) - (a.growth30 ?? -Infinity));
}

export function verticalKpis(projects) {
  const ranked = rankBy(projects, "growth30");
  const leader = ranked.length && ranked[0].growth30 != null ? ranked[0].repo : null;
  return {
    count: projects.length,
    industries: new Set(projects.map((p) => p.industry).filter(Boolean)).size,
    growth30: sumCovered(projects.map((p) => p.growth30)),
    leader,
  };
}

// Line-chart geometry. Null values stay null so the line can break instead of lying about missing weeks.
export function chartPoints(values, { width, height, padX, padTop, padBottom }) {
  const known = values.filter((v) => v != null);
  const max = known.length && Math.max(...known) > 0 ? Math.max(...known) : 1;
  const span = height - padTop - padBottom;
  const step = values.length > 1 ? (width - 2 * padX) / (values.length - 1) : 0;
  return values.map((value, i) =>
    value == null
      ? null
      : {
          x: values.length > 1 ? padX + i * step : width / 2,
          y: padTop + (1 - value / max) * span,
          value,
        },
  );
}

export function splitRuns(points) {
  const runs = [];
  let current = [];
  for (const point of points) {
    if (point) current.push(point);
    else if (current.length) {
      runs.push(current);
      current = [];
    }
  }
  if (current.length) runs.push(current);
  return runs;
}

export function weeklyTotals(projects, weeks) {
  return weeks.map((week, i) => ({
    week,
    gain: sumCovered(projects.map((p) => (p.weekly || [])[i] ?? null)),
  }));
}

// Clears filter values that no project on the current date has, so a select can never
// show "Все …" while an invisible filter is still applied (e.g. after switching the date).
export function validFilters(filters, projects) {
  const result = { ...filters };
  for (const key of ["category", "status", "language", "industry"]) {
    if (result[key] && !projects.some((p) => p[key] === result[key])) result[key] = "";
  }
  return result;
}

// On day one no project has growth figures yet; rank by total stars instead of a wall of "н/д".
export function effectiveMetric(projects, key) {
  if (key === "stars" || !projects.length || projects.some((p) => p[key] != null)) return key;
  return "stars";
}
