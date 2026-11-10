#!/usr/bin/env node
// Architecture invariants and fault reachability, not real LLM/authorization evals.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url), dir = "../../docs/assets/javascripts/playground/";
const AI = require(dir + "ai.js"), SC = require(dir + "scenarios.js"), E = require(dir + "engine.js");
const ids = ["ai-summarizer", "ai-faq", "ai-order-status", "ai-ingestion", "ai-tenant-search", "ai-research", "ai-refunds", "ai-model-routing"];
let passed = 0;
function test(name, fn) { fn(); passed++; console.log("ok " + name); }
function review(id, mutate = () => {}, initial = false) {
  const sc = SC.get(id), d = structuredClone(initial ? sc.design : sc.solution); mutate(d);
  return AI.evaluate(E.normalizeDesign(d), sc, sc.settings);
}
const metrics = (id, mutate, initial) => review(id, mutate, initial).metrics;
const node = (d, id) => d.nodes.find(n => n.id === id);
const remove = (d, id) => { d.nodes = d.nodes.filter(n => n.id !== id); d.edges = d.edges.filter(e => e.from !== id && e.to !== id); };
const edge = (from, to) => ({ id: from + "-" + to, from, to, params: {} });
const covered = id => Object.values(metrics(id)).every(value => value === 100);
test("all eight exercises start incomplete, pass graph checks in one reference, and still require review", () => {
  assert.deepEqual(SC.LIST.filter(s => s.architecture).map(s => s.id), ids);
  for (const id of ids) {
    const sc = SC.get(id);
    assert.ok(sc.requirements.length >= 3 && sc.reviewQuestions.length >= 3 && sc.hints.length);
    assert.equal(sc.aiControls, undefined);
    assert.ok(sc.design.nodes.length <= 4, "minimal starting design: " + id);
    assert.ok(sc.solution.nodes.every(n => Object.keys(n.params).every(key => !key.startsWith("ai"))));
    assert.ok(Object.values(metrics(id, undefined, true)).some(value => value === 0), id);
    assert.ok(covered(id), id);
    assert.equal(review(id).reviewRequired, true);
    assert.equal(review(id).failures.length, 0);
    assert.deepEqual(review(id), review(id), "deterministic graph review");
  }
});
test("the previous checkboxes cannot change architecture scores", () => {
  for (const id of ids) for (const value of [true, false]) {
    const changed = metrics(id, d => d.nodes.forEach(n => Object.assign(n.params, { aiAuthorize: value, aiTenantFilter: value, aiScopedCache: value, aiCitations: value, aiCheckpoint: value, aiAsync: value, aiIdempotent: value })));
    assert.deepEqual(changed, metrics(id));
  }
});
test("handbook retrieval returns to its coordinator before generation", () => {
  assert.equal(metrics("ai-faq", d => { d.edges = d.edges.filter(e => e.id !== "api-model"); d.edges.push(edge("retrieval", "model")); }).arApplicationOwnsModel, 0);
  assert.equal(metrics("ai-faq", d => { const a = d.edges.findIndex(e => e.id === "api-model"), b = d.edges.findIndex(e => e.id === "api-retrieval"); [d.edges[a], d.edges[b]] = [d.edges[b], d.edges[a]]; }).arEvidenceFlow, 0);
  assert.equal(metrics("ai-faq", d => remove(d, "index")).arEvidenceFlow, 0);
  assert.equal(metrics("ai-faq", d => d.edges.push(edge("api", "indexer"))).arSeparateIngestion, 0);
});
test("a separate orchestrator is optional and searchable SQL is a valid retrieval dependency", () => {
  assert.equal(metrics("ai-faq", d => { node(d, "api").type = "orchestrator"; node(d, "index").type = "sql"; }).arEvidenceFlow, 100);
  assert.ok(Object.values(metrics("ai-faq", d => { remove(d, "retrieval"); d.edges.unshift(edge("api", "index")); node(d, "index").type = "sql"; })).every(v => v === 100), "direct database retrieval is valid without a separate retrieval service");
  assert.equal(metrics("ai-faq", d => { d.nodes.push({ id: "query-embedding", type: "llmgw", x: 900, y: 150, params: {} }); d.edges.push(edge("retrieval", "query-embedding")); }).arApplicationOwnsModel, 100, "retrieval may own a distinct query-embedding dependency");
  for (const id of ids) {
    const renamed = metrics(id, d => {
      const names = new Map(d.nodes.map((n, i) => [n.id, "component-" + i]));
      d.nodes.forEach(n => { n.id = names.get(n.id); n.label = "my component"; });
      d.edges.forEach((e, i) => { e.from = names.get(e.from); e.to = names.get(e.to); e.id = "link-" + i; });
    });
    assert.deepEqual(renamed, metrics(id), "not a node-ID or label matcher: " + id);
  }
});
test("background placement matters: a queue after processing cannot protect acceptance", () => {
  for (const id of ["ai-summarizer", "ai-ingestion", "ai-research"]) {
    assert.equal(metrics(id, d => { d.edges = d.edges.filter(e => e.id !== "api-jobs" && e.id !== "jobs-processor"); d.edges.push(edge("api", "processor"), edge("processor", "jobs")); }).arAsyncAcceptance, 0);
    assert.equal(metrics(id, d => { remove(d, "state"); if (id === "ai-research") d.edges = d.edges.filter(e => e.id !== "processor-input"); }).arRecoveryState, 0);
    assert.equal(metrics(id, d => { d.edges = d.edges.filter(e => e.id !== "api-input"); d.edges.push(edge("api", "input")); }).arDurableInput, 0);
    assert.equal(metrics(id, d => d.edges.push(edge("api", "model"))).arAsyncAcceptance, 0);
    assert.equal(metrics(id, d => node(d, "processor").type = "app").arRecoveryState, 100);
    assert.equal(metrics(id, d => {
      if (id === "ai-research") d.edges = d.edges.filter(e => e.id !== "processor-input");
      d.nodes.push({ id: "state-service", type: "microservice", x: 900, y: 400, params: {} });
      d.edges = d.edges.filter(e => e.id !== "processor-state"); d.edges.push(edge("processor", "state-service"), edge("state-service", "state"));
    }).arRecoveryState, 100, "a state-service abstraction is valid");
  }
});
test("the indexing service owns writes rather than the embedding provider", () => {
  assert.equal(metrics("ai-ingestion", d => { d.edges = d.edges.filter(e => e.id !== "processor-index"); d.edges.push(edge("model", "index")); }).arIndexWriter, 0);
  assert.equal(metrics("ai-ingestion", d => { const a = d.edges.findIndex(e => e.id === "processor-index"), b = d.edges.findIndex(e => e.id === "processor-model"); [d.edges[a], d.edges[b]] = [d.edges[b], d.edges[a]]; }).arIndexWriter, 0);
});
test("order data is read before composition; identity implementation requires design review", () => {
  assert.equal(metrics("ai-order-status", d => remove(d, "db")).arLiveRead, 0);
  assert.equal(metrics("ai-order-status", d => remove(d, "identity")).arLiveRead, 100, "inline identity enforcement is not rejected");
  assert.equal(metrics("ai-order-status", d => { d.edges = d.edges.filter(e => e.id !== "api-model"); d.edges.unshift(edge("api", "model")); }).arLiveRead, 0);
});
test("cached responses cannot bypass the access boundary; omitting answer caching is valid", () => {
  assert.equal(metrics("ai-tenant-search", d => { d.edges = d.edges.filter(e => e.id !== "api-cache"); d.edges.unshift(edge("users", "cache")); }).arCachedAccess, 0);
  assert.ok(Object.values(metrics("ai-tenant-search", d => { remove(d, "identity"); remove(d, "permissions"); })).every(v => v === 100), "the graph cannot grade authorization semantics; inline or index-enforced policies require review");
  assert.ok(Object.values(metrics("ai-tenant-search", d => remove(d, "cache"))).every(value => value === 100));
});
test("a parallel model-to-payment bypass fails even when a valid business service exists", () => {
  assert.equal(metrics("ai-refunds", d => d.edges.push(edge("model", "payment"))).arActionBoundary, 0);
  assert.equal(metrics("ai-refunds", d => { d.edges = d.edges.filter(e => e.id !== "api-model"); d.edges.push(edge("api", "model")); }).arActionCoordination, 0);
  assert.equal(metrics("ai-refunds", d => remove(d, "ledger")).arActionBoundary, 100, "durable idempotency semantics require review rather than a database-presence checkbox");
});
test("routing has independent model paths and application-owned validation; dispatch policy requires review", () => {
  assert.equal(metrics("ai-model-routing", d => node(d, "router").type = "app").arModelChoice, 100, "application-owned routing is valid without a particular gateway component");
  assert.equal(metrics("ai-model-routing", d => { d.edges = d.edges.filter(e => e.id !== "router-strong"); d.edges.push(edge("small", "strong")); }).arModelChoice, 0);
  assert.equal(metrics("ai-model-routing", d => remove(d, "strong")).arAlternateModel, 0);
  assert.equal(metrics("ai-model-routing", d => { d.edges = d.edges.filter(e => e.id !== "api-validation"); d.edges.unshift(edge("api", "validation")); }).arValidationBoundary, 0);
  assert.equal(metrics("ai-model-routing", d => d.edges.filter(e => e.from === "router").forEach((e, i) => e.params.ratio = i ? 0.2 : 0.8)).arAlternateModel, 100);
});
test("disabled paths, disconnected nodes and missing users cannot produce a passing design", () => {
  for (const id of ids) {
    assert.ok(Object.values(metrics(id, d => d.edges.forEach(e => e.params.ratio = 0))).some(v => v === 0));
    assert.ok(Object.values(metrics(id, d => d.edges.forEach(e => e.params.filter = "write"))).some(v => v === 0));
    assert.ok(Object.values(metrics(id, d => d.nodes = d.nodes.filter(n => n.type !== "client"))).some(v => v === 0));
  }
});
test("check architecture runs without a traffic simulation and invalidates when the diagram changes", () => {
  const sc = SC.get("ai-faq"), sim = E.create(sc.solution, sc.settings, { scenario: sc });
  assert.equal(sim.stats().arEvidenceFlow, undefined);
  sim.reviewArchitecture(); assert.equal(sim.t, 0); assert.equal(sim.stats().arEvidenceFlow, 100);
  assert.ok(sim.goals().every(g => g.pass)); assert.equal(sim.report().complete, true);
  sim.setDesign(sc.design); assert.equal(sim.resultsStale, true); assert.ok(sim.goals().every(g => !g.pass));
  sim.reviewArchitecture(); assert.equal(sim.resultsStale, false); assert.equal(sim.stats().arEvidenceFlow, 0);
  assert.ok(sim.aiResult.failures.every(f => f.caseId && f.en));
});
console.log(`\n${passed} passed`);
