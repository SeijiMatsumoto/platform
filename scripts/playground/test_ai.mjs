#!/usr/bin/env node
/* Behavioral checks of the explicit AI fixtures, separate from load simulation.
 * node scripts/playground/test_ai.mjs
 */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const dir = "../../docs/assets/javascripts/playground/";
const AI = require(dir + "ai.js"), SC = require(dir + "scenarios.js"), E = require(dir + "engine.js");
let passed = 0;
function test(name, fn) { fn(); passed++; console.log("ok " + name); }
function replay(id, mutate = () => {}, initial = false) {
  const s = SC.get(id), d = structuredClone(initial ? s.design : s.solution);
  mutate(d);
  return AI.evaluate(E.normalizeDesign(d), s, s.settings).metrics;
}
function node(d, id) { return d.nodes.find(n => n.id === id); }
function disconnect(d, id) { d.edges = d.edges.filter(e => e.to !== id); }
const ids = ["ai-summarizer", "ai-faq", "ai-order-status", "ai-ingestion", "ai-tenant-search", "ai-research", "ai-refunds", "ai-model-routing"];
test("eight bilingual AI scenarios in the intended progression", () => {
  assert.deepEqual(SC.LIST.filter(s => s.group === "ai").map(s => s.id), ids);
  for (const id of ids) {
    const s = SC.get(id);
    assert.ok(s.title.en && s.title.pt && s.brief.en && s.brief.pt);
    for (const hint of s.hints) assert.ok(hint.en && hint.pt);
    for (const initial of [false, true]) {
      const m = replay(id, undefined, initial);
      Object.values(m).forEach(n => assert.ok(Number.isFinite(n)));
      assert.deepEqual(m, replay(id, undefined, initial), "fixture replay must be deterministic");
      const goals = s.goals.map(g => E.checkGoal(g, m).pass);
      assert.equal(initial ? goals.some(x => !x) : goals.every(Boolean), true, id);
    }
  }
});
test("summary limits include reserved output; truncation cannot preserve missing facts", () => {
  assert.equal(replay(ids[0]).aiContextErrors, 0);
  assert.ok(replay(ids[0], d => node(d, "api").params.aiOutputTokens = 16000).aiContextErrors > 0);
  assert.ok(replay(ids[0], d => node(d, "api").params.aiChunkTokens = 20000).aiFactRecall < 100);
  assert.ok(replay(ids[0], d => node(d, "llm").params.quota = 1).aiShortP95 > 10);
  assert.ok(replay(ids[0], d => node(d, "api").params.aiAsync = false).aiLongP99 > 120);
});
test("FAQ source recall, citation support and no-answer behavior are independent", () => {
  assert.ok(replay(ids[1], d => node(d, "memory").params.aiTopK = 1).aiRetrievalRecall < 90);
  assert.equal(replay(ids[1], d => node(d, "memory").params.aiCitations = false).aiSupportedClaims, 0);
  assert.equal(replay(ids[1], d => node(d, "memory").params.aiAbstain = false).aiAbstention, 0);
  assert.equal(replay(ids[1], d => disconnect(d, "index")).aiRetrievalRecall, 0);
});
test("order tools enforce ACLs, evidence, validation and bounded attempts", () => {
  assert.ok(replay(ids[2], d => node(d, "tools").params.aiAuthorize = false).aiUnauthorized > 0);
  assert.ok(replay(ids[2], d => node(d, "tools").params.aiEvidence = false).aiWrongStatus > 0);
  assert.ok(replay(ids[2], d => node(d, "tools").params.aiValidate = false).aiWrongStatus > 0);
  assert.ok(replay(ids[2], d => node(d, "tools").params.aiAttempts = 5).aiToolP95 > 3);
  assert.ok(replay(ids[2], d => disconnect(d, "orders")).aiWrongStatus > 0);
});
test("ingestion needs durable originals, connected queue and stable chunk IDs", () => {
  assert.ok(replay(ids[3], d => disconnect(d, "jobs")).aiIndexErrors > 0);
  assert.ok(replay(ids[3], d => disconnect(d, "originals")).aiIndexErrors > 0);
  assert.ok(replay(ids[3], d => node(d, "worker").params.aiIdempotent = false).aiIndexErrors > 0);
  assert.ok(replay(ids[3], d => node(d, "llm").params.quota = 1).aiIndexP99 > 600);
  assert.ok(replay(ids[3], d => node(d, "api").params.aiAsync = false).aiAckP99 > 0.5);
});
test("tenant retrieval permissions cannot be replaced by cache scoping, or vice versa", () => {
  assert.ok(replay(ids[4], d => node(d, "memory").params.aiTenantFilter = false).aiUnauthorized > 0);
  assert.ok(replay(ids[4], d => node(d, "cache").params.aiScopedCache = false).aiUnauthorized > 0);
  assert.ok(replay(ids[4], d => node(d, "memory").params.aiPermissionTtl = 120).aiRevocationS > 30);
  assert.ok(replay(ids[4], d => node(d, "memory").params.aiTopK = 1).aiPermittedRecall < 95);
  assert.ok(replay(ids[4], d => disconnect(d, "index")).aiUnauthorized > 0);
});
test("research resumes only from connected durable state; tiny budgets do not finish jobs", () => {
  assert.equal(replay(ids[5], d => disconnect(d, "state")).aiJobCompletion, 0);
  assert.ok(replay(ids[5], d => node(d, "agent").params.aiCheckpoint = false).aiRepeatedSteps > 1);
  assert.equal(replay(ids[5], d => node(d, "agent").params.aiMaxCalls = 1).aiJobCompletion, 0);
  assert.ok(replay(ids[5], d => node(d, "agent").params.aiMaxFetches = 40).aiBudgetViolations > 0);
  assert.equal(replay(ids[5], d => disconnect(d, "sources")).aiJobCompletion, 0);
});
test("refund ledger deduplicates committed-but-timed-out operations and records approvals", () => {
  assert.equal(replay(ids[6]).aiDuplicateRefunds, 0);
  assert.equal(replay(ids[6], d => node(d, "tools").params.aiIdempotent = false).aiDuplicateRefunds, 20);
  assert.equal(replay(ids[6], d => node(d, "tools").params.aiAuthorize = false).aiUnauthorized, 10);
  assert.equal(replay(ids[6], d => disconnect(d, "ledger")).aiRefundCompletion, 0);
  assert.ok(replay(ids[6], d => node(d, "tools").params.aiReconcileS = 300).aiRefundCompletion < 99);
});
test("routing savings alone cannot satisfy quality, schema and outage requirements", () => {
  assert.ok(replay(ids[7], d => node(d, "llm").params.aiRoute = false).aiCostPerTicket > 0.005);
  assert.ok(replay(ids[7], d => node(d, "llm").params.aiEscalate = false).aiClassification < 95);
  assert.ok(replay(ids[7], d => node(d, "llm").params.aiValidate = false).aiValidCompletion < 99);
  assert.ok(replay(ids[7], d => node(d, "llm").params.fallbackModel = false).aiValidCompletion < 99);
  assert.equal(replay(ids[7], d => disconnect(d, "llm")).aiValidCompletion, 0);
});
test("AI metrics remain pending until completion and appear in engine reports", () => {
  const sc = SC.get(ids[1]), sim = E.create(sc.solution, { ...sc.settings, duration: 1 }, { scenario: sc });
  assert.equal(sim.stats().aiRetrievalRecall, undefined);
  assert.ok(sim.goals().every(g => !g.pass));
  while (!sim.done) sim.step(10);
  assert.equal(sim.stats().aiRetrievalRecall, 100);
  assert.ok(sim.report().ai.evidence[0].en);
  assert.ok(sim.goals().every(g => g.pass));
});
test("zero traffic and excluding filters cannot pass the AI fixtures", () => {
  for (const id of ids) {
    const sc = SC.get(id);
    for (const params of [{ ratio: 0 }, { ratio: 0.5 }, { filter: "write" }]) {
      const metrics = replay(id, d => d.edges.forEach(e => Object.assign(e.params, params)));
      assert.ok(sc.goals.some(g => !E.checkGoal(g, metrics).pass), id + " falsely passed disabled flow");
    }
  }
  const sc = SC.get("ai-faq"), d = structuredClone(sc.solution);
  d.edges.find(e => e.to === "index").params.ratio = 0;
  assert.equal(AI.evaluate(d, sc, sc.settings).metrics.aiRetrievalRecall, 0);
});
test("failed checks carry bounded bilingual witness cases; passing solutions do not", () => {
  for (const id of ids) {
    const sc = SC.get(id);
    const result = AI.evaluate(E.normalizeDesign(sc.design), sc, sc.settings);
    assert.ok(result.failures.length, id + " has no failure explanation");
    for (const f of result.failures) assert.ok(f.caseId && f.en && f.pt && f.metric);
    assert.equal(AI.evaluate(E.normalizeDesign(sc.solution), sc, sc.settings).failures.length, 0);
  }
  const sc = SC.get("ai-refunds"), result = AI.evaluate(E.normalizeDesign(sc.design), sc, sc.settings);
  assert.ok(result.failures.some(f => f.caseId === "refund-1" && f.metric === "aiDuplicateRefunds"));
});
test("completed results become stale after settings or design edits and require a fresh run", () => {
  const sc = SC.get("ai-summarizer");
  const run = () => { const sim = E.create(sc.solution, { ...sc.settings, duration: 1 }, { scenario: sc }); while (!sim.done) sim.step(10); return sim; };
  for (const edit of [sim => sim.setSettings({ targetRps: 2000000 }), sim => sim.setDesign(sc.design)]) {
    const sim = run(); assert.ok(sim.stats().aiShortP95 < 10);
    edit(sim);
    assert.equal(sim.resultsStale, true);
    assert.equal(sim.stats().aiShortP95, undefined);
    assert.equal(sim.report().stale, true);
    assert.ok(sim.goals().every(g => !g.pass && g.value === undefined));
  }
  const unchanged = run(); unchanged.setSettings({ targetRps: sc.settings.targetRps });
  assert.equal(!!unchanged.resultsStale, false);
  assert.equal(run().report().stale, false);
});

console.log(`\n${passed} passed`);
