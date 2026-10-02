// Pure dashboard logic: no DOM, no fetch. Shared by the page and node tests.

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

export function fmt(n) {
  if (n == null) return "н/д";
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
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

function sumKnown(values) {
  const known = values.filter((v) => v != null);
  return known.length ? known.reduce((a, b) => a + b, 0) : null;
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
      growth30: sumKnown(items.map((p) => p.growth30)),
      growth90: sumKnown(items.map((p) => p.growth90)),
      avgAcceleration: accel.length ? accel.reduce((a, b) => a + b, 0) / accel.length : null,
    };
  });
  return rows.sort((a, b) => (b.growth30 ?? -Infinity) - (a.growth30 ?? -Infinity));
}

export function weeklyTotals(projects, weeks) {
  return weeks.map((week, i) => ({ week, gain: sumKnown(projects.map((p) => (p.weekly || [])[i] ?? null)) }));
}
