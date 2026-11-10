/* Architecture practice checks (no DOM, provider calls, or simulated LLM quality).
 * Edges are ordered calls, not messages passed from one sibling to another.
 * A coordinator calls dependencies in diagram order and owns their returned data.
 * Only graph properties are graded. Scenario review questions cover semantics
 * (ACLs, stable operation IDs, retrieval quality, cancellation, model selection).
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./catalog.js"));
  else { root.SDP = root.SDP || {}; root.SDP.ai = factory(root.SDP.catalog); }
})(typeof self !== "undefined" ? self : this, function (CAT) {
  "use strict";
  var COMPUTE = ["app", "microservice", "worker", "serverless", "orchestrator", "container"];
  var STORE = ["sql", "nosql", "dbcluster", "objstore"];
  var BROKER = ["queue", "stream", "pubsub"];
  function graph(design, settings, removed) {
    removed = removed || [];
    var nodes = (design.nodes || []).filter(function (n) { return removed.indexOf(n.id) < 0; }), by = {};
    nodes.forEach(function (n) { by[n.id] = n; });
    var read = settings.readRatio === undefined ? 1 : settings.readRatio;
    var edges = (design.edges || []).filter(function (e) {
      var p = e.params || {};
      return by[e.from] && by[e.to] && CAT.get(by[e.from].type).role !== "side" && CAT.get(by[e.to].type).role !== "side" && (p.ratio === undefined || p.ratio > 0) && !(p.filter === "read" && !read) && !(p.filter === "write" && read === 1);
    });
    function out(n) { return n ? edges.filter(function (e) { return e.from === n.id; }) : []; }
    function path(from, to, sync, avoid) {
      if (!from || !to) return null;
      var todo = [[from.id]], seen = {}, blocked = avoid || [];
      while (todo.length) {
        var p = todo.shift(), id = p[p.length - 1];
        if (blocked.indexOf(id) >= 0 || seen[id]) continue;
        if (id === to.id) return p;
        seen[id] = true;
        out(by[id]).forEach(function (e) {
          if (sync && ((e.params || {}).async || BROKER.indexOf(by[e.to].type) >= 0)) return;
          todo.push(p.concat([e.to]));
        });
      }
      return null;
    }
    var sources = nodes.filter(function (n) { return ["client", "mobile", "scheduler"].indexOf(n.type) >= 0; });
    function active(n) { return sources.some(function (s) { return !!path(s, n); }); }
    function children(n, types) { return out(n).map(function (e) { return by[e.to]; }).filter(function (c) { return !types || types.indexOf(c.type) >= 0; }); }
    function branch(n, target) { return out(n).findIndex(function (e) { return !!path(by[e.to], target); }); }
    function before(n, dependency, target) { var a = branch(n, dependency), b = branch(n, target); return a >= 0 && b >= 0 && a < b; }
    function coverage(target) {
      var best = {}, todo = [];
      sources.forEach(function (s) { best[s.id] = 1; todo.push(s.id); });
      while (todo.length) {
        var id = todo.pop();
        out(by[id]).forEach(function (e) {
          var p = e.params || {}, ratio = p.ratio === undefined ? 1 : p.ratio;
          var share = p.filter === "read" ? read : p.filter === "write" ? 1 - read : 1;
          var value = best[id] * ratio * share;
          if (value > (best[e.to] || 0)) { best[e.to] = value; todo.push(e.to); }
        });
      }
      return target ? best[target.id] || 0 : 0;
    }
    return { nodes: nodes, by: by, edges: edges, sources: sources, out: out, path: path, active: active, children: children, before: before, coverage: coverage };
  }
  function evaluate(design, scenario, settings) {
    if (!scenario.aiKind) return null;
    var g = graph(design, settings), active = g.nodes.filter(g.active), hosts = active.filter(function (n) { return COMPUTE.indexOf(n.type) >= 0; });
    var users = g.sources.filter(function (n) { return n.type !== "scheduler"; });
    function userReach(n) { return users.some(function (s) { return !!g.path(s, n); }); }
    var fronts = hosts.filter(function (h) { return users.some(function (source) {
      var path = g.path(source, h); return path && !path.slice(1, -1).some(function (id) { return COMPUTE.indexOf(g.by[id].type) >= 0; });
    }); });
    var metrics = {}, failures = [], evidence = [], traces = [];
    function name(n) { return n ? n.label || n.type : "missing component"; }
    function check(metric, pass, id, message, route) {
      metrics[metric] = pass ? 100 : 0;
      var step = { metric: metric, caseId: id, pass: !!pass, en: message, route: route || [] };
      traces.push(step);
      if (!pass) failures.push(step);
    }
    function model(n) { return g.children(n, ["llmgw"])[0]; }
    function ownedStore(n, types) {
      var blocked = active.filter(function (c) { return ["llmgw", "memory", "toolreg", "cache"].concat(BROKER).indexOf(c.type) >= 0; }).map(function (c) { return c.id; });
      return active.find(function (data) { return types.indexOf(data.type) >= 0 && !!g.path(n, data, false, blocked); });
    }
    function store(n) { return ownedStore(n, STORE); }
    function retrieval(n) { return g.children(n, ["memory"])[0] || g.children(n, ["vectordb", "search", "sql", "nosql"])[0]; }
    function evidenceOwner(n) {
      var r = retrieval(n), m = model(n);
      return userReach(n) && r && m && (r.type !== "memory" || g.children(r, ["vectordb", "search", "sql", "nosql"]).length) && g.before(n, r, m);
    }
    function directReadOwner(n) {
      var m = model(n);
      return userReach(n) && m && g.children(n).some(function (c) {
        return ["toolreg", "sql", "nosql", "dbcluster", "microservice", "app"].indexOf(c.type) >= 0 && g.nodes.some(function (d) { return STORE.indexOf(d.type) >= 0 && g.path(c, d); }) && g.before(n, c, m);
      });
    }
    var brokers = active.filter(function (n) { return BROKER.indexOf(n.type) >= 0; });
    var jobs = [];
    brokers.forEach(function (broker) {
      hosts.forEach(function (handler) {
        if (g.path(broker, handler) && g.sources.some(function (source) { return g.path(source, broker, false, [handler.id]); })) jobs.push({ broker: broker, handler: handler });
      });
    });
    var job = jobs.find(function (j) { return model(j.handler); }), handler = job && job.handler;
    function asyncAcceptance() {
      return job && fronts.some(function (api) { return g.path(api, job.broker); }) && fronts.every(function (api) {
        return !g.path(api, handler, true) && !active.some(function (n) { return n.type === "llmgw" && g.path(api, n, true); });
      });
    }
    function durableAcceptance() {
      return job && hosts.some(function (api) { return store(api) && g.before(api, store(api), job.broker); });
    }
    function recovery() {
      var progress = handler && ownedStore(handler, ["sql", "nosql", "dbcluster"]);
      if (!job || !progress) return false;
      var afterCrash = graph(design, settings, [handler.id]);
      return afterCrash.sources.some(function (source) { return afterCrash.path(source, afterCrash.by[job.broker.id]); }) && !!afterCrash.by[progress.id];
    }
    function asynchronousChecks() {
      check("arAsyncAcceptance", asyncAcceptance(), "worker-restart", "Accepted requests must reach durable work without waiting for the long-running handler. A broker downstream of that handler does not protect acceptance.");
      check("arDurableInput", durableAcceptance(), "request-disconnect", "The acceptance service must persist input or job state before handing work off. Connect that write before the background-work branch.");
      check("arRecoveryState", recovery(), "worker-restart", "Remove the processing service: the acceptance path and its external progress store must survive. State reachable only through the model is not application-owned progress.");
    }
    if (scenario.aiKind === "summarizer" || scenario.aiKind === "ingestion" || scenario.aiKind === "research") asynchronousChecks();
    if (scenario.aiKind === "summarizer") {
      check("arApplicationOwnsModel", !!handler && !!model(handler) && !!store(handler), "long-transcript", "A background application service must own generation and persist progress outside its process. Explain splitting and combining long inputs in the design review.");
    }
    if (scenario.aiKind === "ingestion") {
      var writer = hosts.find(function (n) {
        var m = model(n), input = g.children(n, ["objstore"])[0], index = g.children(n, ["vectordb", "search"])[0];
        return m && input && index && g.before(n, input, m) && g.before(n, m, index);
      });
      check("arIndexWriter", !!writer && !!job && !!g.path(job.broker, writer), "document-1", "A background service must read the original, call the embedding model, then write the index itself. The model provider must not own storage writes.", writer ? [name(writer)] : []);
    }
    if (scenario.aiKind === "research") {
      check("arApplicationOwnsModel", !!handler && !!model(handler) && !!g.children(handler, ["toolreg", "thirdparty"]).length, "report-1", "The background application must coordinate model calls and source tools as separate dependencies. Its durable state must not live in either dependency.");
    }
    if (scenario.aiKind === "faq" || scenario.aiKind === "tenant") {
      var owner = hosts.find(evidenceOwner), memory = owner && retrieval(owner), llm = owner && model(owner);
      check("arEvidenceFlow", !!owner, "question-1", "The same application coordinator must request evidence from a searchable source before calling generation. Sibling calls use the order shown on the arrows; arrows represent calls, not implicit prompt composition.", owner ? [name(owner), name(memory), "return evidence", name(owner), name(llm)] : []);
      check("arApplicationOwnsModel", !!owner, "question-1", "The application must own the final generation call. A retrieval service may have its own embedding or reranking calls; explain their purpose separately from answer generation.");
      if (scenario.aiKind === "faq") {
        var ingesters = hosts.filter(function (n) { return n !== owner && model(n) && store(n) && g.children(n, ["vectordb", "search", "sql", "nosql"]).length; });
        check("arSeparateIngestion", ingesters.length > 0 && !!owner && ingesters.every(function (n) { return !g.path(owner, n, true); }), "handbook-update", "A handbook update must have a separate indexing path. Answering a question must not synchronously run that indexing job. An asynchronous refresh is acceptable.");
      } else {
        var caches = active.filter(function (n) { return n.type === "cache"; });
        var appBoundaries = hosts.map(function (h) { return h.id; }).concat(active.filter(function (n) { return n.type === "apigw"; }).map(function (n) { return n.id; }));
        var guarded = caches.every(function (cache) {
          return !users.some(function (source) { return !!g.path(source, cache, false, appBoundaries); });
        });
        check("arCachedAccess", guarded, "cached-answer", "Every route to a reused answer must pass application-owned code first. A direct client-to-cache bypass fails even if another protected route exists. This does not prove cache-key scope or authorization; explain those policies in the review.");
      }
    }
    if (scenario.aiKind === "order") {
      var reader = hosts.find(directReadOwner);
      check("arLiveRead", !!reader, "order-1", "Read live business data before composing the answer. An isolated database or a read owned by the model is not a live application lookup.");
      check("arApplicationOwnsModel", !!reader && !active.some(function (n) { return n.type === "llmgw" && g.children(n, STORE).length; }), "order-1", "The application must coordinate the business read and the answer. Tool adapters may delegate to a business service; a separate orchestrator is optional.");

    }
    if (scenario.aiKind === "refund") {
      var payments = active.filter(function (n) { return n.type === "payment" && userReach(n); });
      var calls = g.edges.filter(function (e) { return payments.some(function (p) { return p.id === e.to; }); });
      var boundaries = calls.map(function (e) { return COMPUTE.indexOf(g.by[e.from].type) >= 0 ? g.by[e.from] : null; });
      check("arActionBoundary", payments.length > 0 && boundaries.every(Boolean), "refund-1", "Every payment mutation must be owned by an application/business service. A model or tool catalog calling the payment provider directly bypasses that responsibility.");
      var actionOwner = hosts.some(function (h) { return model(h) && payments.every(function (payment) { return g.before(h, model(h), payment); }); });
      check("arActionCoordination", payments.length > 0 && actionOwner, "proposed-refund", "An application coordinator must receive the model's proposal before requesting the business action. Approval rules, stable operation IDs and reconciliation are not inferred from the existence of an Auth node or database.");
    }
    if (scenario.aiKind === "routing") {
      var routers = active.filter(function (n) { var c = CAT.get(n.type); return c && (COMPUTE.indexOf(n.type) >= 0 || c.role === "split" || n.type === "apigw") && g.children(n, ["llmgw"]).length >= 2; });
      var router = routers[0], models = router ? g.children(router, ["llmgw"]) : [];
      check("arModelChoice", !!router, "easy-ticket", "Distinct model routes must have a common application owner rather than being chained model-to-model. Explain which calls are conditional: two arrows do not prove selective dispatch or escalation.");
      var survivor = models.length >= 2 && models.every(function (dead) { var remaining = graph(design, settings, [dead.id]); return models.some(function (other) { return other.id !== dead.id && remaining.sources.some(function (source) { return remaining.path(source, remaining.by[other.id]); }); }); });
      check("arAlternateModel", survivor, "provider-outage", "Remove either model: another model route must remain reachable. This is a fault reachability check, not proof of fallback quality, timeout policy, or provider independence.");
      check("arValidationBoundary", !!router && hosts.some(function (h) { return g.path(h, router) && g.children(h, ["safety"]).some(function (v) { return router.id === h.id ? models.every(function (m) { return g.before(h, m, v); }) : g.before(h, router, v); }); }), "invalid-classification", "The application must validate a selected model's result after the model-routing call returns. Explain dispatch policy, escalation criteria and failure handling in the review.");
    }
    var critical = active.filter(function (n) { return ["llmgw", "vectordb", "payment"].indexOf(n.type) >= 0 || BROKER.indexOf(n.type) >= 0; });
    if (!users.length || !critical.length || critical.some(function (n) {
      var exclusive = g.edges.some(function (edge) { var from = g.by[edge.from], def = CAT.get(from.type); return edge.to === n.id && (def.role === "split" || from.type === "apigw") && g.children(from, [n.type]).length > 1; });
      return g.coverage(n) < (exclusive ? 0.000001 : 0.999);
    })) {
      Object.keys(metrics).forEach(function (key) {
        if (metrics[key] === 100) {
          metrics[key] = 0;
          var failure = { metric: key, caseId: "incomplete-flow", pass: false, route: [], en: "A required branch receives only part of the workload, or there is no active processing path. Restore the call ratio/request filter before relying on this check." };
          traces = traces.filter(function (t) { return t.metric !== key; }); traces.push(failure); failures.push(failure);
        }
      });
    }
    evidence.push({ en: "Automated checks cover graph structure, ordered calls, and the stated component-removal probes only. They do not evaluate LLM answers, ACL logic, stable IDs, transactional guarantees, or model-routing quality. Complete the design review even when these checks pass." });
    return { metrics: metrics, failures: failures, evidence: evidence, traces: traces, reviewRequired: true };
  }
  return { evaluate: evaluate, graph: graph };
});
