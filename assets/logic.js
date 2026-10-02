// Pure dashboard logic: no DOM, no fetch. Shared by the page and node tests.

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

export function fmt(n) {
  if (n == null) return "н/д";
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
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
