/* Deterministic AI teaching fixtures, NOT live LLM evaluations.
 * Replay an explicit workload against the connected design. The fluid engine
 * still owns load charts; these checks run at the end and report their own units.
 * No quality percentage is read from a slider: facts, retrieval IDs, permissions,
 * classifications and side effects are checked against synthetic ground truth.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./catalog.js"));
  else { root.SDP = root.SDP || {}; root.SDP.ai = factory(root.SDP.catalog); }
})(typeof self !== "undefined" ? self : this, function (CAT) {
  "use strict";
  function percentile(xs, p) { if (!xs.length) return 0; xs.sort(function (a, b) { return a - b; }); return xs[Math.ceil(xs.length * p) - 1]; }
  function rate(n, d) { return d ? 100 * n / d : 0; }
  function graph(design) {
    var nodes = design.nodes || [], edges = design.edges || [];
    function descendants(start) {
      var seen = {}, todo = [start];
      while (todo.length) {
        var id = todo.pop(); if (seen[id]) continue; seen[id] = true;
        edges.forEach(function (e) { if (e.from === id) todo.push(e.to); });
      }
      return seen;
    }
    var active = {};
    nodes.filter(function (n) { return n.type === "client" || n.type === "scheduler"; }).forEach(function (n) {
      Object.assign(active, descendants(n.id));
    });
    function find(type, from) {
      var reach = from ? descendants(from.id) : active;
      return nodes.find(function (n) { return n.type === type && reach[n.id]; }) || null;
    }
    return { find: find, p: function (n) { return n ? CAT.params(n) : {}; }, has: function (a, b) { return !!(a && b && descendants(a.id)[b.id]); } };
  }
  /* FCFS queue with explicit parallel slots. Provider quota limits aggregate
   * service rate, so adding worker replicas cannot bypass a provider bottleneck. */
  function pool(slots, quota) {
    var nextAdmission = 0;
    var free = Array(Math.max(1, Math.min(1000, Math.floor(slots || 1)))).fill(0);
    return function (arrival, service, calls) {
      var i = free.indexOf(Math.min.apply(null, free));
      var start = Math.max(arrival, free[i], nextAdmission);
      if (quota) nextAdmission = start + (calls || 1) / quota;
      free[i] = start + service; return free[i];
    };
  }
  function evaluate(design, scenario, settings) {
    var kind = scenario.aiKind;
    if (!kind) return null;
    var g = graph(design), app = g.find("app"), orch = g.find("orchestrator"), llm = g.find("llmgw", app || orch),
      memory = g.find("memory", app || orch), tool = g.find("toolreg", orch || app), worker = g.find("worker"),
      lp = g.p(llm), ap = g.p(app), op = g.p(orch), mp = g.p(memory), tp = g.p(tool), wp = g.p(worker),
      metrics = {}, evidence = [];
    var rps = Math.max(0.01, settings.targetRps), reachable = !!llm;
    function note(en, pt) { evidence.push({ en: en, pt: pt }); }
    function value(key, n) { metrics[key] = Number.isFinite(n) ? n : 1e9; }
    if (kind === "summarizer") {
      var chunk = ap.aiChunkTokens, output = ap.aiOutputTokens || 1000, context = lp.aiContextTokens || 0,
        slots = Math.min(ap.threads || 1, lp.threads || 1), schedule = pool(slots, lp.quota || 1), short = [], long = [], errors = 0, facts = 0;
      for (var i = 0; i < 1000; i++) {
        var tokens = i % 10 === 0 ? 100000 : 3000, size = chunk || tokens, calls = Math.ceil(tokens / size),
          valid = reachable && Math.min(tokens, size) + output <= context,
          service = calls * ((lp.latencyMs || 1200) / 1000 + size / 20000),
          // Quota is shared by all concurrently running calls.
          finish = schedule(i / rps, service, calls), latency = finish - i / rps;
        if (!valid) errors += calls;
        for (var f = 0; f < 20; f++) if (valid && Math.floor(f * tokens / 20 / size) < calls) facts++;
        (tokens === 3000 ? short : long).push(valid ? latency : 1e9);
      }
      value("aiContextErrors", errors); value("aiShortP95", percentile(short, 0.95));
      value("aiLongP99", Math.max(percentile(long, 0.99), !ap.aiAsync ? 1e9 : 0)); value("aiFactRecall", rate(facts, 20000));
      note("1,000 transcripts: 900 × 3,000 tokens, 100 × 100,000; 20 positioned facts each. Long-job goal also requires asynchronous acknowledgement (50 ms fixture).", "1.000 transcrições: 900 × 3.000 tokens, 100 × 100.000; 20 fatos posicionados em cada. A meta de jobs longos também exige confirmação assíncrona (50 ms no fixture).");
    }
    if (kind === "faq" || kind === "tenant") {
      var vector = g.find("vectordb", memory), retrieved = 0, supported = 0, claims = 0, abstained = 0, violations = 0, revoke = 0, permittedFound = 0, permittedTotal = 0;
      for (var q = 0; q < 100; q++) {
        var missing = q % 5 === 0, tenant = q % 2, docs = [];
        // Equal vocabulary is deliberate: relevance alone cannot enforce an ACL.
        for (var d = 0; d < 6; d++) docs.push({ id: d, tenant: d % 2, allowed: d !== 4, score: d < 3 ? 10 - d : 1 });
        if (kind === "tenant") docs[0].tenant = 1 - tenant;
        var eligible = docs.filter(function (doc) { return kind !== "tenant" || !mp.aiTenantFilter || (doc.tenant === tenant && doc.allowed); });
        var hits = memory && vector && !missing ? eligible.sort(function (a, b) { return b.score - a.score; }).slice(0, mp.aiTopK || 1) : [];
        if (kind === "faq" && !missing) retrieved += [0, 1, 2].filter(function (id) { return hits.some(function (hit) { return hit.id === id; }); }).length;
        if (missing && mp.aiAbstain) abstained++;
        if (!missing || !mp.aiAbstain) {
          claims += 3;
          if (reachable && mp.aiCitations) supported += [0, 1, 2].filter(function (id) { return hits.some(function (hit) { return hit.id === id; }); }).length;
        }
        if (kind === "tenant") {
          var permitted = docs.filter(function (doc) { return doc.tenant === tenant && doc.allowed; }).slice(0, 3);
          if (!missing) {
            permittedTotal += permitted.length;
            permittedFound += permitted.filter(function (doc) { return hits.some(function (hit) { return hit.id === doc.id; }); }).length;
          }
          violations += hits.filter(function (hit) { return hit.tenant !== tenant || !hit.allowed; }).length;
          var cache = g.find("cache", app);
          // Same question, different identity: a prewarmed answer must not leak.
          if (cache && !g.p(cache).aiScopedCache) violations++;
        }
      }
      if (kind === "faq") {
        value("aiRetrievalRecall", rate(retrieved, 80 * 3)); value("aiSupportedClaims", rate(supported, claims));
        value("aiAbstention", rate(abstained, 20)); value("aiTokenReduction", memory && vector ? 100 * (1 - ((mp.aiTopK || 1) * 500 + 1000) / 100000) : 0);
        note("100 questions: 80 require three labeled 500-token sections; 20 have no answer. Claims require retrieved source IDs. Baseline: 100,000 handbook tokens; query overhead: 1,000.", "100 perguntas: 80 exigem três seções rotuladas de 500 tokens; 20 não têm resposta. Afirmações exigem IDs recuperados. Base: 100.000 tokens do manual; overhead: 1.000.");
      } else {
        // A query at t=60 revokes an ACL cached at t=59; probes every second.
        revoke = mp.aiTenantFilter ? Math.max(0, (mp.aiPermissionTtl || 0) - 1) : 1e9;
        var cacheNode = g.find("cache", app);
        if (cacheNode && !g.p(cacheNode).aiScopedCache) revoke = Math.max(revoke, g.p(cacheNode).ttlS || 300);
        value("aiUnauthorized", !memory || !vector || !reachable ? 1e9 : violations);
        value("aiRevocationS", revoke); value("aiPermittedRecall", rate(permittedFound, permittedTotal));
        var vp = g.p(vector), retrieval = pool(Math.min(mp.threads || 1, vp.threads || 1)), waits = [];
        for (var probe = 0; probe < 1000; probe++) {
          var at = probe / rps, duration = ((mp.latencyMs || 20) + (vp.latencyMs || 15)) / 1000;
          waits.push(memory && vector ? retrieval(at, duration) - at : 1e9);
        }
        value("aiRetrievalP95", percentile(waits, 0.95));
        note("100 cross-tenant/ACL probes, a prewarmed same-question cache, and permission revocation at t=60 s. TTL is the maximum stale-permission window; cache version includes ACL changes.", "100 sondagens de tenant/ACL, cache aquecido da mesma pergunta e revogação em t=60 s. TTL é a janela máxima de permissão antiga; a versão do cache inclui mudanças de ACL.");
      }
    }
    if (kind === "order") {
      var order = g.find("sql", tool), latencies = [], wrong = 0, unauthorized = 0, attempts = 0;
      for (var o = 0; o < 100; o++) {
        var denied = o % 10 === 0, unavailable = o % 10 === 1, malformed = o % 10 === 2,
          canCall = !!(tool && order && reachable), tries = unavailable ? (tp.aiAttempts || 5) : 1;
        attempts = Math.max(attempts, tries);
        if (denied && !tp.aiAuthorize && canCall) unauthorized++;
        var success = canCall && !unavailable && (!malformed || tp.aiValidate) && (!denied || !tp.aiAuthorize);
        // A failed read returns no live status: guessing is never a valid status.
        if (!success && (!tp.aiEvidence || (!denied && !unavailable) || !canCall)) wrong++;
        latencies.push((lp.latencyMs || 1200) / 1000 + tries * (unavailable ? 0.6 : 0.15));
      }
      value("aiWrongStatus", wrong); value("aiUnauthorized", unauthorized);
      value("aiToolP95", percentile(latencies, 0.95)); value("aiToolAttempts", attempts);
      note("100 orders: ten forbidden, ten tool outages, ten malformed arguments. Successful reads return the fixture's live status; failed reads must abstain. Outage attempts time out after 600 ms.", "100 pedidos: dez proibidos, dez falhas da ferramenta, dez argumentos inválidos. Leituras válidas retornam o estado atual do fixture; falhas exigem abstenção. Timeout de 600 ms por tentativa.");
    }
    if (kind === "ingestion") {
      var queue = g.find("queue", app), store = g.find("objstore", app), embed = g.find("llmgw", worker), index = g.find("vectordb", embed),
        ep = g.p(embed), sizeIn = wp.aiChunkTokens || 4000, chunks = Math.ceil(4000 / sizeIn),
        workers = Math.max(1, (wp.replicas || 1) * (wp.threads || 1)), process = pool(workers, ep.quota || 1), ages = [], lost = 0, duplicates = 0,
        durable = !!(queue && store && worker && g.has(queue, worker)), maxQuota = 0;
      for (var doc = 0; doc < 10000; doc++) {
        var arrival = doc * 300 / 10000, svc = chunks * (ep.latencyMs || 1200) / 1000,
          complete = process(arrival, svc, chunks), crashed = complete - svc < 120 && complete >= 120;
        if (!embed || !index || !worker || !durable && arrival < 120 && complete >= 120) { lost++; continue; }
        if (crashed && !wp.aiCheckpoint) complete += svc;
        if (crashed && !wp.aiIdempotent) duplicates += chunks;
        ages.push(complete - arrival);
        // Sliding one-second quota demand (aggregate calls/s at saturation).
        maxQuota = Math.max(maxQuota, Math.min(ep.quota || 1, Math.min(workers, doc + 1) * chunks / svc));
      }
      value("aiAckP99", durable && ap.aiAsync ? 0.05 : percentile(ages, 0.99));
      value("aiIndexP99", ages.length === 10000 ? percentile(ages, 0.99) : 1e9);
      value("aiIndexErrors", lost + duplicates); value("aiQuotaPeak", maxQuota);
      note("10,000 × 4,000-token documents arrive over 300 s; worker crash at t=120 s. Replay uses worker concurrency, embedding latency and quota. Durable originals + queue recover work; stable chunk IDs prevent duplicate indexing.", "10.000 documentos de 4.000 tokens chegam em 300 s; worker cai em t=120 s. Replay usa concorrência, latência e cota de embeddings. Originais duráveis + fila recuperam trabalho; IDs estáveis evitam duplicação.");
    }
    if (kind === "research") {
      var state = g.find("sql", orch), sources = g.find("thirdparty", tool), durableState = !!(state && op.aiCheckpoint), completed = 0,
        repeat = 0, maxCalls = 0, maxFetches = 0, times = [], sched = pool(op.threads || 1);
      for (var job = 0; job < 40; job++) {
        var modelCalls = op.aiMaxCalls || 20, fetches = op.aiMaxFetches || 40,
          serviceTime = modelCalls * (lp.latencyMs || 6000) / 1000 + fetches * 2,
          start = job * 2, end = sched(start, serviceTime), crosses = start < 90 && end > 90,
          repeated = crosses ? (durableState ? 1 : Math.floor((90 - start) / Math.max(1, serviceTime) * modelCalls)) : 0;
        repeat = Math.max(repeat, repeated); maxCalls = Math.max(maxCalls, modelCalls + (durableState ? 0 : repeated)); maxFetches = Math.max(maxFetches, fetches);
        if (crosses) end += durableState ? 5 : serviceTime;
        if (reachable && tool && sources && modelCalls >= 10 && fetches >= 20 && (!crosses || durableState)) completed++;
        times.push(end - start);
      }
      value("aiJobCompletion", rate(completed, 40)); value("aiJobP99", percentile(times, 0.99));
      value("aiRepeatedSteps", repeat); value("aiBudgetViolations", (maxCalls > 10 ? 1 : 0) + (maxFetches > 20 ? 1 : 0));
      note("40 reports, each needing ten model calls and twenty fetches; worker restart at t=90 s. Saved steps resume after 5 s; volatile runs lose their job record. Limits below the required work cannot finish a report.", "40 relatórios, cada um exige dez chamadas ao modelo e vinte buscas; reinício em t=90 s. Etapas salvas retomam após 5 s; jobs voláteis perdem o registro. Limites menores que o trabalho necessário não concluem o relatório.");
    }
    if (kind === "refund") {
      var ledger = g.find("sql", tool), payment = g.find("payment", tool), ids = {}, charges = 0, unauthorizedRefunds = 0, completedRefunds = 0;
      for (var refund = 0; refund < 100; refund++) {
        var approved = refund % 10 !== 0, timeout = refund % 5 === 1, key = "refund-" + refund, count = timeout ? 2 : 1;
        if (tp.aiAuthorize && (!approved || !ledger)) continue;
        if (!reachable || !payment || !tool) continue;
        for (var attempt = 0; attempt < count; attempt++) {
          var operation = tp.aiIdempotent && ledger ? key : key + "-" + attempt;
          if (!ids[operation]) { ids[operation] = true; charges++; if (!approved) unauthorizedRefunds++; }
        }
        if (approved && (!timeout || ledger && tp.aiReconcileS <= 120)) completedRefunds++;
      }
      value("aiDuplicateRefunds", Math.max(0, charges - (tp.aiAuthorize ? 90 : 100)));
      value("aiUnauthorized", unauthorizedRefunds); value("aiReconcileS", ledger && payment ? tp.aiReconcileS || 300 : 1e9);
      value("aiRefundCompletion", rate(completedRefunds, 90));
      note("100 refund requests: 90 approved; twenty commit before their reply times out. Replay retries those operations and checks the payment ledger and recorded authorization; reconciliation resolves uncertain results.", "100 reembolsos: 90 aprovados; vinte efetivam antes do timeout da resposta. Replay repete as operações e verifica o registro de pagamentos e a autorização; reconciliação resolve resultados incertos.");
    }
    if (kind === "routing") {
      var correct = 0, validOutputs = 0, cost = 0, routingTimes = [];
      for (var ticket = 0; ticket < 1000; ticket++) {
        var hard = ticket % 5 === 0, ambiguous = ticket % 10 === 1, outage = ticket >= 300 && ticket < 330,
          small = lp.aiRoute && !hard, escalated = small && ambiguous && lp.aiEscalate,
          answered = reachable && (!outage || lp.fallbackModel), malformedOutput = ticket % 50 === 0 && !lp.aiValidate;
        if (answered && !malformedOutput) validOutputs++;
        if (answered && !malformedOutput && (!small || !ambiguous || escalated)) correct++;
        cost += small ? 0.001 + (escalated ? 0.012 : 0) : 0.012;
        routingTimes.push(answered ? (small ? 0.4 + (escalated ? 1.5 : 0) : 1.5) * (outage ? 1.3 : 1) : 30);
      }
      value("aiClassification", rate(correct, 1000)); value("aiCostPerTicket", cost / 1000);
      value("aiRoutingP95", percentile(routingTimes, 0.95)); value("aiValidCompletion", rate(validOutputs, 1000));
      note("1,000 labeled tickets: 80% easy, 20% hard, 10% ambiguous. Synthetic prices: $0.001 small / $0.012 strong; 30 outage probes and 2% malformed outputs. Escalation uses fixture uncertainty, not an assumed real confidence score.", "1.000 tickets rotulados: 80% simples, 20% difíceis, 10% ambíguos. Preços sintéticos: US$ 0,001 pequeno / US$ 0,012 forte; 30 sondagens de falha e 2% saídas inválidas. Escalonamento usa incerteza do fixture, não confiança real presumida.");
    }
    return { metrics: metrics, evidence: evidence };
  }
  return { evaluate: evaluate };
});
