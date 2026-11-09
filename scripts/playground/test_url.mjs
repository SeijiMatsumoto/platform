#!/usr/bin/env node
// Exercise the real UI lifecycle and URL handlers without rendering a browser.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const dir = "../../docs/assets/javascripts/playground/";
const SC = require(dir + "scenarios.js");
const source = fs.readFileSync(new URL(dir + "ui.js", import.meta.url), "utf8");
function element(tag) {
  const e = { tag, children: [], attrs: {}, style: {}, classList: { toggle() {}, add() {}, remove() {} }, appendChild(child) { this.children.push(child); return child; }, setAttribute(k, v) { this.attrs[k] = v; }, addEventListener() {} };
  let text = "", html = "";
  Object.defineProperty(e, "textContent", { get: () => text + html + e.children.map(c => c.textContent).join(" "), set: v => { text = String(v); html = ""; e.children = []; } });
  Object.defineProperty(e, "innerHTML", { get: () => html, set: v => { html = v; text = ""; e.children = []; } });
  return e;
}
function setup(href, modes = ["full", "compact"], storage = new Map()) {
  let location = new URL(href), entries = [href], index = 0;
  const listeners = {}, roots = modes.map(mode => ({ dataset: { mode, scenario: "monolith" }, setAttribute() {} }));
  const window = { SDP: { catalog: require(dir + "catalog.js"), engine: require(dir + "engine.js"), scenarios: SC, rng: require(dir + "rng.js") }, addEventListener: (name, cb) => listeners[name] = cb };
  const document = { createElement: element, readyState: "loading", addEventListener() {}, querySelectorAll: () => roots, contains: root => roots.includes(root) };
  const history = {
    state: { preserved: true },
    pushState(state, _, href) { entries = entries.slice(0, index + 1); entries.push(href); index++; location = new URL(href); this.state = state; },
    replaceState(state, _, href) { entries[index] = href; location = new URL(href); this.state = state; }
  };
  const sandbox = { window, document, history, URL, console, requestAnimationFrame() {}, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }, btoa: s => Buffer.from(s, "binary").toString("base64"), atob: s => Buffer.from(s, "base64").toString("binary") };
  Object.defineProperty(sandbox, "location", { get: () => location });
  vm.runInNewContext(source, sandbox);
  const P = window.SDP.ui.Playground.prototype;
  const start = P.newSim;
  // Only replace drawing/animation; selection, restore, history and sharing stay real.
  for (const name of ["build", "buildToolbar", "newSim", "renderGraph", "fit", "renderSide", "updateLive", "updateTiles", "drawCharts", "showTab"]) P[name] = function () {};
  window.SDP.ui.init();
  return {
    get url() { return location; }, get count() { return entries.length; }, get state() { return history.state; },
    instances: window.SDP.ui.instances(), storage, start: p => start.call(p),
    back() { if (index) { location = new URL(entries[--index]); listeners.popstate(); } },
    forward() { if (index + 1 < entries.length) { location = new URL(entries[++index]); listeners.popstate(); } }
  };
}
let passed = 0;
function test(name, fn) { fn(); passed++; console.log("ok " + name); }
test("query restores the full canvas; compact embeds remain independent", () => {
  const h = setup("https://example.test/platform/playground/?scenario=ai-faq&lang=pt#guide");
  assert.equal(h.instances[0].scenario.id, "ai-faq");
  assert.equal(h.instances[1].scenario.id, "monolith");
  assert.equal(h.url.searchParams.get("lang"), "pt");
  assert.equal(h.url.hash, "#guide");
  assert.equal(h.count, 1);
});
test("selection updates query, preserves other URL fields, and Back/Forward restores selection", () => {
  const h = setup("https://example.test/platform/pt/playground/?lang=pt#guide"), p = h.instances[0];
  assert.equal(h.url.searchParams.get("scenario"), "monolith");
  p.switchScenario("ai-ingestion");
  assert.equal(h.url.searchParams.get("scenario"), "ai-ingestion");
  assert.equal(h.url.pathname, "/platform/pt/playground/");
  assert.equal(h.url.searchParams.get("lang"), "pt");
  assert.equal(h.url.hash, "#guide");
  assert.equal(h.state.preserved, true);
  p.switchScenario("ai-refunds");
  h.back(); assert.equal(p.scenario.id, "ai-ingestion");
  h.back(); assert.equal(p.scenario.id, "monolith");
  h.forward(); assert.equal(p.scenario.id, "ai-ingestion");
  assert.equal(h.count, 3, "popstate must not add history entries");
});
test("invalid scenario IDs fall back safely; reset and repeat selection do not duplicate history", () => {
  const h = setup("https://example.test/platform/playground/?scenario=unknown"), p = h.instances[0];
  assert.equal(p.scenario.id, "monolith");
  assert.equal(h.url.searchParams.get("scenario"), "monolith");
  p.switchScenario("ai-faq"); const count = h.count;
  p.switchScenario("ai-faq"); p.switchScenario("ai-faq", true); p.switchScenario("unknown");
  assert.equal(h.count, count);
});
test("shared designs take precedence, switching clears stale payload, Back restores the shared design", () => {
  const d = structuredClone(SC.get("scale-out").solution); d.nodes[0].label = "shared custom client";
  const payload = Buffer.from(JSON.stringify({ s: "scale-out", d, st: {} })).toString("base64url");
  const h = setup("https://example.test/platform/playground/?scenario=ai-faq#sdp=" + payload), p = h.instances[0];
  assert.equal(p.scenario.id, "scale-out");
  assert.equal(h.url.searchParams.get("scenario"), "scale-out");
  assert.equal(p.design.nodes[0].label, "shared custom client");
  p.switchScenario("ai-research"); assert.equal(h.url.hash, "");
  h.back();
  assert.equal(p.scenario.id, "scale-out");
  assert.equal(p.design.nodes[0].label, "shared custom client");
  h.forward(); assert.equal(p.scenario.id, "ai-research");
  assert.equal(h.count, 2);
});
test("only the first full canvas controls the page URL; compact-only pages never change it", () => {
  const h = setup("https://example.test/platform/playground/?scenario=ai-faq", ["full", "full"]);
  h.instances[1].switchScenario("ai-refunds");
  assert.equal(h.url.searchParams.get("scenario"), "ai-faq");
  const compact = setup("https://example.test/platform/playground/scenarios/?scenario=ai-faq", ["compact"]);
  assert.equal(compact.instances[0].scenario.id, "monolith");
  compact.instances[0].switchScenario("ai-refunds");
  assert.equal(compact.url.searchParams.get("scenario"), "ai-faq");
});
test("links from embeds carry the scenario query and the encoded design", () => {
  const h = setup("https://example.test/platform/playground/scenarios/", ["compact"]), p = h.instances[0];
  const link = new URL(p.fullUrl(), h.url);
  assert.equal(link.pathname, "/platform/playground/");
  assert.equal(link.searchParams.get("scenario"), "monolith");
  assert.ok(link.hash.startsWith("#sdp="));
});
test("workspace restores design and settings, migrates legacy saves and isolates scenarios", () => {
  const url = "https://example.test/platform/playground/?scenario=ai-faq";
  const h = setup(url), p = h.instances[0];
  p.design.nodes[0].label = "saved users";
  Object.assign(p.settings, { targetRps: 333, seed: 789, profile: "spike", readRatio: 0.6 });
  p.persistWorkspace();
  const restored = setup(url, ["full"], h.storage).instances[0];
  assert.equal(restored.design.nodes[0].label, "saved users");
  assert.equal(restored.settings.targetRps, 333); assert.equal(restored.settings.seed, 789);
  assert.equal(restored.settings.profile, "spike"); assert.equal(restored.settings.readRatio, 0.6);
  restored.switchScenario("ai-refunds");
  assert.equal(restored.settings.targetRps, SC.get("ai-refunds").settings.targetRps);
  const design = structuredClone(SC.get("monolith").design); design.nodes[0].label = "legacy users";
  const storage = new Map([["sdp:v1:monolith", JSON.stringify(design)]]);
  const legacy = setup("https://example.test/platform/playground/", ["full"], storage);
  assert.equal(legacy.instances[0].design.nodes[0].label, "legacy users");
  legacy.start(legacy.instances[0]);
  assert.equal(JSON.parse(storage.get("sdp:v2:monolith")).version, 2);
});
test("completed runs persist as immutable snapshots and comparisons survive reload", () => {
  const url = "https://example.test/platform/playground/?scenario=ai-faq", h = setup(url), p = h.instances[0];
  const E = require(dir + "engine.js");
  function finish() { p.sim = E.create(p.design, { ...p.settings, duration: 1 }, { scenario: p.scenario }); while (!p.sim.done) p.sim.step(10); p.captureCompletedRun(); }
  finish(); assert.equal(p.previousRun, null);
  const first = JSON.stringify(p.lastRun);
  p.captureCompletedRun(); assert.equal(p.previousRun, null, "do not capture one run twice");
  p.setLive({ targetRps: 333 });
  assert.equal(p.sim.resultsStale, true);
  assert.equal(JSON.stringify(p.lastRun), first, "editing must preserve the completed evidence");
  assert.equal(p.comparison(p.sim.report()).rows[0].after, undefined);
  finish();
  assert.equal(JSON.stringify(p.previousRun), first);
  const comparison = p.comparison(p.sim.report());
  assert.equal(comparison.baseline.settings.targetRps, 20);
  assert.ok(p.scenario.goals.every(goal => typeof comparison.rows.find(row => row.metric === goal.metric).delta === "number"));
  const restored = setup(url, ["full"], h.storage).instances[0];
  assert.equal(restored.lastRun.settings.targetRps, 333);
  assert.equal(restored.previousRun.settings.targetRps, 20);
  restored.switchScenario("ai-refunds"); assert.equal(restored.lastRun, null);
});
test("shared payload wins over saved settings; reset clears both saved versions", () => {
  const url = "https://example.test/platform/playground/?scenario=ai-faq", h = setup(url), p = h.instances[0];
  p.settings.targetRps = 777; p.persistWorkspace();
  const payload = Buffer.from(JSON.stringify({ s: "ai-faq", d: SC.get("ai-faq").solution, st: { targetRps: 55 } })).toString("base64url");
  const shared = setup(url + "#sdp=" + payload, ["full"], h.storage).instances[0];
  assert.equal(shared.settings.targetRps, 55);
  shared.switchScenario("ai-faq", true);
  assert.equal(shared.settings.targetRps, 20);
  assert.equal(shared.design.nodes.length, SC.get("ai-faq").design.nodes.length);
});

test("reports render failure witnesses, stale warnings, saved runs and comparison tables", () => {
  const h = setup("https://example.test/platform/playground/?scenario=ai-refunds"), p = h.instances[0];
  const E = require(dir + "engine.js");
  p.panels = { report: element("section") };
  function finish() { p.sim = E.create(p.design, { ...p.settings, duration: 1 }, { scenario: p.scenario }); while (!p.sim.done) p.sim.step(10); p.captureCompletedRun(); }
  finish(); p.renderReport();
  assert.match(p.panels.report.textContent, /refund-1/);
  assert.match(p.panels.report.textContent, /Failure examples/);
  p.tab = "report";
  p.design = structuredClone(SC.get("ai-refunds").solution); p.commit();
  assert.match(p.panels.report.textContent, /Results are outdated/);
  assert.doesNotMatch(p.panels.report.textContent, /Failure examples/);
  finish(); p.renderReport();
  assert.match(p.panels.report.textContent, /Compare with the previous run/);
  assert.match(p.panels.report.textContent, /Metric Previous Current Change/);
  assert.doesNotMatch(p.panels.report.textContent, /Failure examples/);
  assert.match(p.reportMarkdown(p.sim.report()), /Comparison with previous run/);
  const reload = setup("https://example.test/platform/playground/?scenario=ai-refunds", ["full"], h.storage), restored = reload.instances[0];
  reload.start(restored); restored.panels = { report: element("section") }; restored.renderReport();
  assert.match(restored.panels.report.textContent, /Last saved completed run/);
  assert.match(restored.panels.report.textContent, /Compare with the previous run/);
  restored.switchScenario("ai-refunds", true); reload.start(restored);
  assert.equal(restored.lastRun, null, "reset must not recapture the outgoing completed run");
  assert.equal(restored.previousRun, null);
});

console.log(`\n${passed} passed`);
