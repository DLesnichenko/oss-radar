import test from "node:test";
import assert from "node:assert/strict";
import { esc, filterProjects, rankBy, segments, weeklyTotals, fmt } from "../assets/logic.js";

const p = (over) => ({
  repo: "a/x", category: "Прочее", status: "ускоряется", language: "Python",
  purpose: "", stars: 1, growth7: 1, growth30: 1, growth90: 1, acceleration: 1, weekly: [], ...over,
});

test("esc escapes html special characters and tolerates null", () => {
  assert.equal(esc(`<img onerror="x">&'`), "&lt;img onerror=&quot;x&quot;&gt;&amp;&#39;");
  assert.equal(esc(null), "");
  assert.ok(!esc("<script>alert(1)</script>").includes("<"));
});

test("filterProjects treats empty values as 'all'", () => {
  const list = [p({ repo: "a/1" }), p({ repo: "a/2", language: "Go" })];
  assert.equal(filterProjects(list, { category: "", status: "", language: "", query: "" }).length, 2);
  assert.deepEqual(
    filterProjects(list, { language: "Go" }).map((x) => x.repo),
    ["a/2"],
  );
});

test("filterProjects matches category, status and query case-insensitively", () => {
  const list = [
    p({ repo: "a/Voice", purpose: "Audio studio", category: "Контент и дизайн", status: "замедляется" }),
    p({ repo: "a/other" }),
  ];
  assert.equal(filterProjects(list, { category: "Контент и дизайн" }).length, 1);
  assert.equal(filterProjects(list, { status: "замедляется" }).length, 1);
  assert.equal(filterProjects(list, { query: "VOICE" }).length, 1);
  assert.equal(filterProjects(list, { query: "audio" }).length, 1);
});

test("filterProjects returns an empty array when nothing matches", () => {
  assert.deepEqual(filterProjects([p({})], { query: "nonexistent-xyz" }), []);
});

test("rankBy sorts descending and puts null values last", () => {
  const list = [p({ repo: "n", growth30: null }), p({ repo: "lo", growth30: 5 }), p({ repo: "hi", growth30: 50 })];
  assert.deepEqual(rankBy(list, "growth30").map((x) => x.repo), ["hi", "lo", "n"]);
  assert.deepEqual(list.map((x) => x.repo), ["n", "lo", "hi"], "input must not be mutated");
});

test("segments groups by category and sums growth, ignoring nulls in averages", () => {
  const list = [
    p({ category: "A", growth30: 10, growth90: 100, acceleration: 2 }),
    p({ category: "A", growth30: 30, growth90: null, acceleration: null }),
    p({ category: "B", growth30: 100, growth90: 5, acceleration: null }),
  ];
  assert.deepEqual(segments(list), [
    { name: "B", count: 1, growth30: 100, growth90: 5, avgAcceleration: null },
    { name: "A", count: 2, growth30: 40, growth90: 100, avgAcceleration: 2 },
  ]);
});

test("segments can group by another key and names a missing value", () => {
  const list = [p({ language: null, growth30: 1 }), p({ language: "Go", growth30: 2 })];
  assert.deepEqual(segments(list, "language").map((s) => s.name), ["Go", "Не указан"]);
});

test("weeklyTotals sums weeks and yields null when every value is missing", () => {
  const weeks = ["w1", "w2"];
  const list = [p({ weekly: [3, null] }), p({ weekly: [4, null] })];
  assert.deepEqual(weeklyTotals(list, weeks), [
    { week: "w1", gain: 7 },
    { week: "w2", gain: null },
  ]);
});

test("fmt groups thousands with a non-breaking space and shows н/д for null", () => {
  assert.equal(fmt(29044), "29 044");
  assert.equal(fmt(999), "999");
  assert.equal(fmt(-1234567), "-1 234 567");
  assert.equal(fmt(null), "н/д");
});
