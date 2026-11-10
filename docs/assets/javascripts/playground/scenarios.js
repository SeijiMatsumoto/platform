/*
 * System Design Playground: scenarios.
 *
 * Each scenario is a lesson: a realistic situation, an initial design that
 * FAILS its goals in an instructive way, the load settings (profile, target
 * RPS, read share, seed, chaos), scripted events (things that happen at a
 * fixed time, e.g. "the sale opens at t = 60 s"), 2–4 goals, 1–3 hints and
 * one possible solution (loaded by "Show a possible solution").
 *
 * Node coordinates are the centre of the box; the flow goes left → right.
 * Works in the browser (window.SDP.scenarios) and in Node (module.exports).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else { root.SDP = root.SDP || {}; root.SDP.scenarios = api; }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ─── tiny builders ─── */
  function T(en, pt) { return { en: en, pt: pt }; }
  function N(id, type, x, y, label, params) { return { id: id, type: type, x: x, y: y, label: label || "", params: params || {} }; }
  function E(from, to, params) { return { id: from + "-" + to, from: from, to: to, params: params || {} }; }
  function F(id, type, x, y, w, h, name, extra) {
    var f = { id: id, type: type, x: x, y: y, w: w, h: h, name: name };
    if (type === "vpc") f.region = (extra && extra.region) || name; else f.zone = (extra && extra.zone) || name;
    return f;
  }
  /* a Kubernetes Cluster frame */
  function K(id, x, y, w, h, name, params) { return { id: id, type: "k8s", x: x, y: y, w: w, h: h, name: name, params: params || {} }; }
  function D(nodes, edges, frames) { return { version: 1, nodes: nodes, edges: edges, frames: frames || [] }; }
  function G(metric, op, value) { return { metric: metric, op: op, value: value }; }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  /* a design derived from another one: change node params, add/remove nodes and edges */
  function derive(base, change) {
    var d = clone(base);
    (change.set || []).forEach(function (s) {
      d.nodes.forEach(function (n) { if (n.id === s[0]) for (var k in s[1]) n.params[k] = s[1][k]; });
    });
    if (change.dropNodes) d.nodes = d.nodes.filter(function (n) { return change.dropNodes.indexOf(n.id) < 0; });
    (change.setFrames || []).forEach(function (s) {
      d.frames.forEach(function (f) { if (f.id === s[0]) { f.params = f.params || {}; for (var k in s[1]) f.params[k] = s[1][k]; } });
    });
    if (change.dropEdges) d.edges = d.edges.filter(function (e) { return change.dropEdges.indexOf(e.id) < 0; });
    d.edges = d.edges.filter(function (e) { return !change.dropNodes || (change.dropNodes.indexOf(e.from) < 0 && change.dropNodes.indexOf(e.to) < 0); });
    (change.move || []).forEach(function (m) { d.nodes.forEach(function (n) { if (n.id === m[0]) { n.x = m[1]; n.y = m[2]; } }); });
    d.nodes = d.nodes.concat(change.nodes || []);
    (change.edgeParams || []).forEach(function (s) { d.edges.forEach(function (e) { if (e.id === s[0]) for (var k in s[1]) e.params[k] = s[1][k]; }); });
    d.edges = d.edges.concat(change.edges || []);
    d.frames = (d.frames || []).concat(change.frames || []);
    return d;
  }

  var LIST = [], COURSE = [];
  function add(s) { LIST.push(s); }

  /* ═══ blank ═══ */
  add({
    id: "blank",
    title: T("Blank canvas", "Tela em branco"),
    brief: T("An empty canvas. Add components from the palette, connect them (drag from the small handle on the right of a node), choose a load profile and press ▶.",
      "Uma tela vazia. Adicione componentes da paleta, conecte-os (arraste da alça à direita de um nó), escolha um perfil de carga e aperte ▶."),
    settings: { profile: "load", targetRps: 100, readRatio: 0.9, seed: 42, chaos: "off" },
    design: D([], []), goals: [], hints: [], solution: null
  });

  /* ═══ monolith ═══ */
  var mono = D([N("client", "client", 80, 200, "users"), N("app", "app", 320, 200, "app"), N("db", "sql", 560, 200, "db")],
    [E("client", "app"), E("app", "db")]);
  add({
    id: "monolith",
    title: T("Monolith: find the breaking point", "Monólito: encontre o ponto de ruptura"),
    brief: T("Version 1 of the app: one app server and one PostgreSQL. The breakpoint profile ramps the load until errors pass 5% or p99 explodes. Where does it break, and which component breaks first? Make it survive 2 000 req/s without spending more than 2 000 USD/month.",
      "Versão 1 da aplicação: um servidor de aplicação e um PostgreSQL. O perfil breakpoint aumenta a carga até os erros passarem de 5% ou o p99 explodir. Onde quebra, e qual componente quebra primeiro? Faça aguentar 2 000 req/s gastando no máximo 2 000 USD/mês."),
    settings: { profile: "breakpoint", targetRps: 600, readRatio: 0.9, seed: 7, chaos: "off" },
    design: mono,
    goals: [G("breakingPoint", ">=", 2000), G("costPerMonth", "<", 2000)],
    hints: [
      T("Open the Report: the bottleneck is the first node above 85% utilization. One replica serves ≈ 500 req/s.", "Abra o Relatório: o gargalo é o primeiro nó acima de 85% de utilização. Uma réplica atende ≈ 500 req/s."),
      T("A stateless app scales horizontally: put a Load Balancer in front and raise the replicas.", "Uma aplicação sem estado escala horizontalmente: coloque um Load Balancer na frente e aumente as réplicas."),
      T("After the app, watch the database: writes cost 3× a read, and there is only one primary.", "Depois da aplicação, observe o banco: escritas custam 3× uma leitura, e há um só primário.")
    ],
    solution: D([N("client", "client", 80, 200, "users"), N("lb", "lb", 280, 200), N("app", "app", 480, 200, "app", { replicas: 6 }), N("db", "sql", 700, 200, "db")],
      [E("client", "lb"), E("lb", "app"), E("app", "db")])
  });

  /* ═══ scale-out ═══ */
  var scale = D([N("client", "client", 80, 200, "users"), N("lb", "lb", 300, 200), N("app", "app", 520, 200, "catalog", { replicas: 2 }), N("db", "sql", 760, 200, "catalog-db")],
    [E("client", "lb"), E("lb", "app"), E("app", "db")]);
  add({
    id: "scale-out",
    title: T("Scale out behind a load balancer", "Escalar horizontalmente atrás de um balanceador"),
    brief: T("The catalog gets 1 500 req/s. Two replicas are not enough, and at t = 80 s one replica crashes. The load balancer keeps sending it traffic until it notices (30 s without health checks). Meet the goals with headroom for one failure (N+1).",
      "O catálogo recebe 1 500 req/s. Duas réplicas não bastam, e em t = 80 s uma réplica cai. O balanceador continua mandando tráfego para ela até perceber (30 s sem health checks). Cumpra as metas com folga para uma falha (N+1)."),
    settings: { profile: "load", targetRps: 1500, readRatio: 0.9, seed: 11, chaos: "off" },
    design: scale,
    events: [{ t: 80, type: "crash", target: "app", durationS: 60, label: T("one catalog replica crashes", "uma réplica do catálogo cai") }],
    goals: [G("errorRate", "<", 1), G("p99", "<", 250), G("costPerMonth", "<", 1800)],
    hints: [
      T("Utilization ρ = λ / (replicas × capacity). Keep ρ below ~0.7 so that losing one replica does not push the others past 1.", "Utilização ρ = λ / (réplicas × capacidade). Mantenha ρ abaixo de ~0,7 para que perder uma réplica não leve as outras acima de 1."),
      T("Add a Health Check and connect it to the Load Balancer: failures are detected in 3 s instead of 30 s.", "Adicione um Health Check e conecte-o ao Load Balancer: falhas detectadas em 3 s em vez de 30 s.")
    ],
    solution: derive(scale, { set: [["app", { replicas: 5 }]], nodes: [N("hc", "healthcheck", 300, 340)], edges: [E("hc", "lb")] })
  });

  /* ═══ read-heavy-cache ═══ */
  var rhc = D([N("client", "client", 80, 200, "users"), N("lb", "lb", 280, 200), N("app", "app", 480, 200, "catalog", { replicas: 8 }), N("db", "sql", 760, 200, "catalog-db")],
    [E("client", "lb"), E("lb", "app"), E("app", "db")]);
  add({
    id: "read-heavy-cache",
    title: T("Read-heavy catalog: add a cache", "Catálogo com muitas leituras: adicione um cache"),
    brief: T("Users browse the catalog: 3 000 req/s, 95% reads. The app tier is fine; the database is not. At t = 100 s the cache (once you have one) is flushed: will the database survive the stampede of misses?",
      "Usuários navegam pelo catálogo: 3 000 req/s, 95% leituras. A camada de aplicação aguenta; o banco não. Em t = 100 s o cache (quando houver um) é esvaziado: o banco sobrevive à avalanche de misses?"),
    settings: { profile: "load", targetRps: 3000, readRatio: 0.95, seed: 3, chaos: "off" },
    design: rhc,
    events: [{ t: 100, type: "flush", targetType: "cache", label: T("cache flushed (deploy / restart)", "cache esvaziado (deploy / reinício)") }],
    goals: [G("p99", "<", 100), G("errorRate", "<", 0.5), G("costPerMonth", "<", 3000)],
    hints: [
      T("Put a Cache between the app and the database (app → cache → db). DB reads become reads × (1 − hit ratio).", "Coloque um Cache entre a aplicação e o banco (app → cache → db). As leituras no banco viram leituras × (1 − taxa de acerto)."),
      T("After the flush every read misses at once: turn on request coalescing so concurrent misses of the same key share one query.", "Após o flush todas as leituras erram ao mesmo tempo: ligue a coalescência para que misses simultâneos da mesma chave dividam uma consulta.")
    ],
    solution: derive(rhc, { dropEdges: ["app-db"], move: [["db", 960, 200]], nodes: [N("cache", "cache", 720, 200, "catalog-cache", { coalescing: true })], edges: [E("app", "cache"), E("cache", "db")] })
  });

  /* ═══ cdn-static ═══ */
  var cdn = D([N("client", "client", 80, 200, "users"), N("dns", "dns", 260, 200), N("lb", "lb", 440, 200), N("app", "app", 640, 200, "web", { replicas: 4 }), N("obj", "objstore", 860, 200, "static assets")],
    [E("client", "dns"), E("dns", "lb"), E("lb", "app"), E("app", "obj")]);
  add({
    id: "cdn-static",
    title: T("Offload static content to a CDN", "Tire o conteúdo estático da origem com uma CDN"),
    brief: T("Product pages are full of images, styles and scripts: 3 000 req/s, 98% reads, served by the app from object storage. Users far from the region wait, and the app is saturated. Serve them from the edge.",
      "As páginas de produtos têm imagens, estilos e scripts: 3 000 req/s, 98% leituras, servidos pela aplicação a partir do object storage. Usuários longe da região esperam, e a aplicação satura. Sirva-os pela borda."),
    settings: { profile: "load", targetRps: 3000, readRatio: 0.98, seed: 5, chaos: "off" },
    design: cdn,
    goals: [G("p99", "<", 150), G("errorRate", "<", 0.5)],
    hints: [
      T("Insert a CDN after DNS (dns → cdn → lb). Origin load = misses + writes.", "Insira uma CDN depois do DNS (dns → cdn → lb). Carga na origem = misses + escritas."),
      T("With 90% hits you need far fewer app replicas. Then look at the cost: at this volume the CDN's egress (USD per GB) becomes the largest line — a real trade-off.", "Com 90% de acertos você precisa de bem menos réplicas. Depois olhe o custo: nesse volume a saída de dados da CDN (USD por GB) vira a maior linha — um trade-off real.")
    ],
    solution: derive(cdn, {
      dropEdges: ["dns-lb"], set: [["app", { replicas: 2 }]],
      move: [["lb", 620, 200], ["app", 800, 200], ["obj", 1000, 200]],
      nodes: [N("cdn", "cdn", 440, 200)], edges: [E("dns", "cdn"), E("cdn", "lb")]
    })
  });

  /* ═══ db-replicas ═══ */
  var dbr = D([N("client", "client", 80, 200, "users"), N("lb", "lb", 280, 200), N("app", "app", 480, 200, "catalog", { replicas: 12 }), N("db", "sql", 720, 200, "catalog-db")],
    [E("client", "lb"), E("lb", "app"), E("app", "db")]);
  add({
    id: "db-replicas",
    title: T("Read replicas and replication lag", "Réplicas de leitura e atraso de replicação"),
    brief: T("4 000 req/s with 10% writes overload the single PostgreSQL primary. Read replicas take reads but never writes, and they lag behind the primary. Keep the lag under 1 s.",
      "4 000 req/s com 10% de escritas sobrecarregam o único primário PostgreSQL. Réplicas de leitura recebem leituras, nunca escritas, e ficam atrás do primário. Mantenha o atraso abaixo de 1 s."),
    settings: { profile: "load", targetRps: 4000, readRatio: 0.9, seed: 13, chaos: "off" },
    design: dbr,
    goals: [G("p99", "<", 150), G("errorRate", "<", 0.5), G("replicationLag", "<", 1)],
    hints: [
      T("Select the database and add read replicas. Read capacity × (1 + replicas); write capacity does not change.", "Selecione o banco e adicione réplicas de leitura. Capacidade de leitura × (1 + réplicas); a de escrita não muda."),
      T("Try 30% writes in the toolbar: replicas stop helping — the primary is the limit (that is when you shard).", "Experimente 30% de escritas na barra: réplicas deixam de ajudar — o limite é o primário (é aí que se particiona).")
    ],
    solution: derive(dbr, { set: [["db", { readReplicas: 2 }]] })
  });

  /* ═══ sharding ═══ */
  var shard = D([N("client", "client", 80, 200, "users"), N("lb", "lb", 280, 200), N("app", "app", 480, 200, "stock", { replicas: 24 }), N("kv", "nosql", 760, 200, "stock-kv", { replicas: 2 })],
    [E("client", "lb"), E("lb", "app"), E("app", "kv")]);
  add({
    id: "sharding",
    title: T("Partitions and the hot key", "Partições e a chave quente"),
    brief: T("Stock lookups and updates (50% writes) at 8 000 req/s on a key-value store with 2 partitions. At t = 60 s a celebrity posts a link to one product: one key gets a huge share of the traffic for a minute. More partitions fix the average — do they fix the hot key?",
      "Consultas e atualizações de estoque (50% escritas) a 8 000 req/s em um banco chave-valor com 2 partições. Em t = 60 s uma celebridade posta o link de um produto: uma chave recebe uma fatia enorme do tráfego por um minuto. Mais partições resolvem a média — resolvem a chave quente?"),
    settings: { profile: "load", targetRps: 8000, readRatio: 0.5, seed: 17, chaos: "off" },
    design: shard,
    events: [{ t: 60, type: "hotkey", factor: 1.0, durationS: 60, label: T("celebrity effect: one hot key", "efeito celebridade: uma chave quente") }],
    goals: [G("errorRate", "<", 0.5), G("p99", "<", 100)],
    hints: [
      T("Raise the partitions of the NoSQL DB: capacity grows with them while keys are spread evenly.", "Aumente as partições do NoSQL: a capacidade cresce com elas enquanto as chaves se espalham."),
      T("During the hot key, the busiest partition takes p₁ + (1 − p₁)/P of the load: adding partitions barely helps. Absorb the hot reads with a Cache in front.", "Com a chave quente, a partição mais ocupada recebe p₁ + (1 − p₁)/P da carga: mais partições quase não ajudam. Absorva as leituras quentes com um Cache na frente.")
    ],
    solution: derive(shard, { dropEdges: ["app-kv"], set: [["kv", { replicas: 8 }]], move: [["kv", 960, 200]], nodes: [N("cache", "cache", 720, 200, "hot-cache")], edges: [E("app", "cache"), E("cache", "kv")] })
  });

  /* ═══ async-queue ═══ */
  var aq = D([N("client", "client", 80, 200, "buyers"), N("lb", "lb", 280, 200), N("app", "app", 480, 200, "order", { replicas: 2 }), N("worker", "worker", 720, 200, "receipt-pdf")],
    [E("client", "lb"), E("lb", "app"), E("app", "worker")]);
  add({
    id: "async-queue",
    title: T("A queue absorbs the spike", "Uma fila absorve o pico"),
    brief: T("Each order generates a PDF receipt (50 ms of work). Today the order service waits for it. The spike profile multiplies the load by 5 for 30 s: the workers cannot keep up and orders fail. Let the user go and do the work later.",
      "Cada pedido gera um recibo em PDF (50 ms de trabalho). Hoje o serviço de pedidos espera por ele. O perfil spike multiplica a carga por 5 durante 30 s: os workers não acompanham e pedidos falham. Libere o usuário e faça o trabalho depois."),
    settings: { profile: "spike", targetRps: 150, readRatio: 0, seed: 19, chaos: "off", spikeFactor: 5 },
    design: aq,
    goals: [G("errorRate", "<", 0.1), G("p99", "<", 100), G("consumerLag", "<", 60)],
    hints: [
      T("Put a Message Queue between the app and the worker: the producer only waits for the broker's ack (a few ms).", "Coloque uma Message Queue entre a aplicação e o worker: o produtor só espera o ack do broker (poucos ms)."),
      T("Backlog grows at (in − drain) and shrinks after the spike; lag = backlog ÷ drain rate. Add workers if the lag is too long.", "O backlog cresce a (entrada − drenagem) e diminui depois do pico; atraso = backlog ÷ taxa de drenagem. Adicione workers se o atraso for longo.")
    ],
    solution: derive(aq, { dropEdges: ["app-worker"], set: [["worker", { replicas: 4 }]], move: [["worker", 920, 200]], nodes: [N("q", "queue", 700, 200, "pdf-jobs")], edges: [E("app", "q"), E("q", "worker")] })
  });

  /* ═══ event-fanout ═══ */
  var ef = D([N("client", "client", 80, 220, "buyers"), N("lb", "lb", 260, 220), N("app", "app", 450, 220, "order", { replicas: 4 }), N("db", "sql", 700, 80, "order-db"),
    N("nt", "notifications", 700, 200, "notification"), N("an", "analytics", 700, 300, "analytics"), N("se", "search", 700, 400, "search-indexer")],
  [E("client", "lb"), E("lb", "app"), E("app", "db"), E("app", "nt"), E("app", "an"), E("app", "se")]);
  add({
    id: "event-fanout",
    title: T("Publish an event, let consumers react", "Publique um evento, deixe os consumidores reagirem"),
    brief: T("When an order is placed, the app notifies the buyer, updates analytics and re-indexes availability — today with three synchronous calls in a row. At t = 60 s analytics becomes 20× slower and orders slow down with it. Decouple the order service from its consumers.",
      "Quando um pedido é feito, a aplicação avisa o comprador, atualiza o analytics e reindexa a disponibilidade — hoje com três chamadas síncronas em sequência. Em t = 60 s o analytics fica 20× mais lento e os pedidos ficam lentos junto. Desacople o serviço de pedidos dos consumidores."),
    settings: { profile: "load", targetRps: 400, readRatio: 0, seed: 23, chaos: "off" },
    design: ef,
    events: [{ t: 60, type: "slow", targetType: "analytics", factor: 20, durationS: 60, label: T("analytics is 20× slower", "analytics 20× mais lento") }],
    goals: [G("p99", "<", 120), G("errorRate", "<", 0.1), G("consumerLag", "<", 60)],
    hints: [
      T("Publish an OrderPlaced event to Kafka (app → kafka) and make the three services consume it (kafka → each).", "Publique um evento OrderPlaced no Kafka (app → kafka) e faça os três serviços consumirem (kafka → cada um)."),
      T("Each consumer group has its own offset: a slow consumer lags behind without slowing the others.", "Cada grupo de consumidores tem seu offset: um consumidor lento fica para trás sem atrasar os outros.")
    ],
    solution: derive(ef, {
      dropEdges: ["app-nt", "app-an", "app-se"], move: [["nt", 900, 200], ["an", 900, 300], ["se", 900, 400]],
      nodes: [N("k", "kafka", 680, 300, "order-events")], edges: [E("app", "k"), E("k", "nt"), E("k", "an"), E("k", "se")]
    })
  });

  /* ═══ cascading-failure ═══ */
  var cf = D([N("client", "client", 80, 200, "users"), N("lb", "lb", 260, 200), N("app", "app", 460, 200, "catalog", { replicas: 4 }), N("db", "sql", 720, 120, "catalog-db"),
    N("tp", "thirdparty", 720, 300, "recommendations")],
  [E("client", "lb"), E("lb", "app"), E("app", "db"), E("app", "tp", { ratio: 0.5 })]);
  add({
    id: "cascading-failure",
    title: T("Cascading failure: a slow dependency", "Falha em cascata: uma dependência lenta"),
    brief: T("Half of the catalog pages call an external recommendations API. At t = 60 s it becomes 20× slower (3 s). Without timeouts every request holds a thread while waiting; the thread pools run out and the whole catalog fails — although the app's CPU is almost idle (Little's Law: threads = λ × W).",
      "Metade das páginas do catálogo chama uma API externa de recomendações. Em t = 60 s ela fica 20× mais lenta (3 s). Sem timeouts cada requisição segura uma thread esperando; os pools de threads se esgotam e o catálogo inteiro falha — embora a CPU da aplicação esteja quase ociosa (Lei de Little: threads = λ × W)."),
    settings: { profile: "load", targetRps: 800, readRatio: 0.9, seed: 29, chaos: "off" },
    design: cf,
    events: [{ t: 60, type: "slow", target: "tp", factor: 20, durationS: 90, label: T("recommendations API 20× slower", "API de recomendações 20× mais lenta") }],
    goals: [G("errorRate", "<", 1), G("p99", "<", 500)],
    hints: [
      T("Select the edge app → recommendations and set a timeout (e.g. 300 ms): a thread never waits longer than that.", "Selecione a aresta app → recommendations e defina um timeout (ex.: 300 ms): uma thread nunca espera mais que isso."),
      T("Add a fallback (show popular items instead) and a circuit breaker: when most calls fail, stop calling for a while.", "Adicione um fallback (mostrar itens populares) e um circuit breaker: quando a maioria das chamadas falha, pare de chamar por um tempo.")
    ],
    solution: derive(cf, { edgeParams: [["app-tp", { timeoutMs: 300, circuitBreaker: true, fallback: true }]] })
  });

  /* ═══ retry-storm ═══ */
  var rs = D([N("client", "client", 80, 200, "users"), N("lb", "lb", 280, 200), N("app", "app", 480, 200, "inventory", { replicas: 6 }), N("db", "sql", 740, 200, "inventory-db")],
    [E("client", "lb"), E("lb", "app"), E("app", "db", { retries: 3, backoff: "none", timeoutMs: 100 })]);
  add({
    id: "retry-storm",
    title: T("Retry storm: when retries make it worse", "Tempestade de retries: quando retentar piora"),
    brief: T("The inventory service retries every failed query 3 times, immediately, with a 100 ms timeout. At t = 60 s the database restarts (8 s). When it comes back, it receives up to 4× the normal load, its queue fills, answers take longer than the timeout… and it never recovers, although the trigger is long gone (a metastable failure).",
      "O serviço de inventário retenta cada consulta falha 3 vezes, na hora, com timeout de 100 ms. Em t = 60 s o banco reinicia (8 s). Quando volta, recebe até 4× a carga normal, a fila enche, as respostas passam do timeout… e ele nunca se recupera, embora o gatilho já tenha passado (uma falha metaestável)."),
    settings: { profile: "load", targetRps: 2000, readRatio: 0.9, seed: 31, chaos: "off" },
    design: rs,
    events: [{ t: 60, type: "crash", target: "db", durationS: 8, label: T("database restarts", "o banco reinicia") }],
    goals: [G("errorRate", "<", 15), G("p99", "<", 300)],
    hints: [
      T("Watch the edge app → db: the rate shown includes retries. With p failures per attempt and r retries the load is × (1 + p + … + pʳ).", "Observe a aresta app → db: a taxa mostrada inclui retries. Com p falhas por tentativa e r retries, a carga é × (1 + p + … + pʳ)."),
      T("Turn on the circuit breaker: when most calls fail it stops calling, the queue drains and the database recovers (the breaker stays open 10 s: a few extra seconds of errors buy a recovery). Fewer retries with exponential backoff + jitter help too.", "Ligue o circuit breaker: quando a maioria falha ele para de chamar, a fila esvazia e o banco se recupera (o breaker fica aberto 10 s: alguns segundos a mais de erro compram a recuperação). Menos retries com backoff exponencial + jitter também ajudam.")
    ],
    solution: derive(rs, { edgeParams: [["app-db", { retries: 1, backoff: "exp+jitter", circuitBreaker: true }]] })
  });

  /* ═══ rate-limiter ═══ */
  var rl = D([N("client", "client", 80, 200, "users + bots", { botShare: 2 }), N("gw", "apigw", 300, 200, "gateway"), N("app", "app", 520, 200, "catalog", { replicas: 4 }), N("db", "sql", 760, 200, "catalog-db")],
    [E("client", "gw"), E("gw", "app"), E("app", "db")]);
  add({
    id: "rate-limiter",
    title: T("Rate limiting protects the backend", "Rate limiting protege o backend"),
    brief: T("1 000 req/s of real users — plus scraper bots sending twice that. The catalog melts down for everybody. Reject the excess fast at the gateway (429) instead of letting it queue behind the real users.",
      "1 000 req/s de usuários reais — mais bots raspadores enviando o dobro disso. O catálogo derrete para todos. Rejeite o excesso rapidamente no gateway (429) em vez de deixá-lo enfileirar atrás dos usuários reais."),
    settings: { profile: "load", targetRps: 1000, readRatio: 0.9, seed: 37, chaos: "off" },
    design: rl,
    goals: [G("errorRate", "<", 1), G("p99", "<", 200)],
    hints: [
      T("Select the API Gateway and set a rate limit below what the app tier can serve (4 × 500 req/s). Token buckets are per client, so the heaviest clients (bots) are cut first.", "Selecione o API Gateway e defina um limite abaixo do que a aplicação aguenta (4 × 500 req/s). Token buckets são por cliente, então os mais pesados (bots) são cortados primeiro."),
      T("Alternative: a WAF in front of the gateway blocks most bots before they cost anything.", "Alternativa: um WAF antes do gateway bloqueia a maioria dos bots antes que custem algo.")
    ],
    solution: derive(rl, { set: [["gw", { rateLimit: 1500 }]] })
  });

  /* ═══ multi-region ═══ */
  var mr = D([N("client", "client", 80, 260, "users"), N("dns", "dns", 260, 260), N("lb", "lb", 480, 160), N("app", "app", 680, 160, "app", { replicas: 4 }), N("db", "sql", 880, 160, "db")],
    [E("client", "dns"), E("dns", "lb"), E("lb", "app"), E("app", "db")],
    [F("r1", "vpc", 390, 90, 590, 150, "sa-east-1")]);
  add({
    id: "multi-region",
    title: T("Surviving a region outage", "Sobrevivendo à queda de uma região"),
    brief: T("The app runs in one cloud region. At t = 60 s the whole region goes down. Build a second region and let DNS move users there. Failover time = detection + DNS TTL: check both.",
      "A aplicação roda em uma região de nuvem. Em t = 60 s a região inteira cai. Construa uma segunda região e deixe o DNS levar os usuários para lá. Tempo de failover = detecção + TTL do DNS: confira os dois."),
    settings: { profile: "load", targetRps: 1000, readRatio: 0.9, seed: 41, chaos: "off" },
    design: mr,
    events: [{ t: 60, type: "region", target: "sa-east-1", durationS: 600, label: T("region sa-east-1 is down", "região sa-east-1 fora do ar") }],
    goals: [G("availability", ">=", 95), G("p99", "<", 80)],
    hints: [
      T("Draw a second VPC frame (another region) with its own load balancer, app and database, and connect DNS to the new load balancer.", "Desenhe uma segunda moldura VPC (outra região) com seu próprio balanceador, aplicação e banco, e conecte o DNS ao novo balanceador."),
      T("Connect a Health Check to the DNS (3 s detection) and lower its TTL: clients keep the old answer for TTL seconds.", "Conecte um Health Check ao DNS (detecção em 3 s) e reduza o TTL: clientes guardam a resposta antiga por TTL segundos."),
      T("Keep each app calling the database of its own region: a cross-region call costs ~70 ms and dies with the other region.", "Mantenha cada aplicação chamando o banco da própria região: uma chamada entre regiões custa ~70 ms e morre com a outra região.")
    ],
    solution: derive(mr, {
      set: [["dns", { ttlS: 5 }]],
      nodes: [N("lb2", "lb", 480, 380), N("app2", "app", 680, 380, "app", { replicas: 4 }), N("db2", "sql", 880, 380, "db"), N("hc", "healthcheck", 260, 420)],
      edges: [E("dns", "lb2"), E("lb2", "app2"), E("app2", "db2"), E("hc", "dns")],
      frames: [F("r2", "vpc", 390, 310, 590, 150, "us-east-1")]
    })
  });

  /* ═══ serverless-burst ═══ */
  var sb = D([N("client", "client", 80, 200, "users"), N("gw", "apigw", 300, 200, "gateway"), N("fn", "serverless", 520, 200, "coupon-check", { concurrencyLimit: 50 }), N("kv", "nosql", 760, 200, "coupon-codes")],
    [E("client", "gw"), E("gw", "fn"), E("fn", "kv")]);
  add({
    id: "serverless-burst",
    title: T("Serverless burst: cold starts and limits", "Pico serverless: cold starts e limites"),
    brief: T("A discount-coupon check runs as a function. The spike profile jumps from 200 to 2 000 req/s. New instances start cold (600 ms) and the account has a concurrency limit of 50. Instances needed = λ × W (Little's Law).",
      "A verificação de cupom de desconto roda como função. O perfil spike salta de 200 para 2 000 req/s. Instâncias novas partem a frio (600 ms) e a conta tem limite de concorrência de 50. Instâncias necessárias = λ × W (Lei de Little)."),
    settings: { profile: "spike", targetRps: 200, readRatio: 0.9, seed: 43, chaos: "off", spikeFactor: 10 },
    design: sb,
    goals: [G("errorRate", "<", 0.5), G("p99", "<", 300), G("costPerMonth", "<", 5000)],
    hints: [
      T("Compute the instances needed at the peak: 2 000 req/s × ~40 ms. Raise the concurrency limit above it.", "Calcule as instâncias no pico: 2 000 req/s × ~40 ms. Aumente o limite de concorrência acima disso."),
      T("Cold starts hit exactly when traffic jumps. Provisioned (always-warm) instances remove them — and cost money even when idle.", "Cold starts acontecem exatamente quando o tráfego salta. Instâncias provisionadas (sempre quentes) os eliminam — e custam mesmo ociosas.")
    ],
    solution: derive(sb, { set: [["fn", { concurrencyLimit: 1000, provisioned: 90 }]] })
  });

  /* ═══ flash-sale ═══ */
  var fs = D([N("client", "client", 80, 220, "users"), N("lb", "lb", 280, 220), N("app", "app", 480, 220, "app", { replicas: 6 }), N("db", "sql", 720, 140, "inventory-db"), N("pay", "payment", 720, 320, "payment provider")],
    [E("client", "lb"), E("lb", "app"), E("app", "db"), E("app", "pay", { filter: "write" })]);
  add({
    id: "flash-sale",
    title: T("Flash sale: a limited-stock launch", "Venda relâmpago: um lançamento com estoque limitado"),
    brief: T("A limited-stock product goes on sale at t = 60 s: traffic jumps 20× (to ~6 000 req/s) for 90 s. 80% of requests read the product page, 20% try to buy. The database holds the stock (no overselling!) and the payment provider accepts 500 req/s. Today everything collapses. Design for the peak: serve reads from the edge and caches, and put buyers in a waiting room (queue) drained at the speed the inventory and the payment provider can handle.",
      "Um produto com estoque limitado entra à venda em t = 60 s: o tráfego salta 20× (~6 000 req/s) por 90 s. 80% das requisições leem a página do produto, 20% tentam comprar. O banco guarda o estoque (nada de vender o que não há!) e o provedor de pagamento aceita 500 req/s. Hoje tudo desaba. Projete para o pico: sirva leituras da borda e de caches, e coloque os compradores numa sala de espera (fila) drenada na velocidade que o inventário e o provedor aguentam."),
    settings: { profile: "load", targetRps: 300, readRatio: 0.8, seed: 2027, chaos: "off" },
    design: fs,
    events: [{ t: 60, type: "viral", factor: 20, durationS: 90, label: T("the sale opens", "abre a venda") }],
    goals: [G("p99", "<", 300), G("errorRate", "<", 1), G("consumerLag", "<", 300)],
    hints: [
      T("Reads: a CDN in front (product pages are the same for everybody) and a Cache before the database.", "Leituras: uma CDN na frente (as páginas do produto são iguais para todos) e um Cache antes do banco."),
      T("Writes: an API Gateway can route reads to the catalog app and writes (filter = write) to a Message Queue — the waiting room. Workers take buyers from it at a safe pace.", "Escritas: um API Gateway pode mandar leituras ao app do catálogo e escritas (filtro = write) para uma Message Queue — a sala de espera. Workers tiram compradores dela num ritmo seguro."),
      T("Size the workers below the payment quota (500 req/s): the consumer lag is how long a buyer waits in line.", "Dimensione os workers abaixo da cota do pagamento (500 req/s): o atraso do consumidor é quanto o comprador espera na fila.")
    ],
    solution: D([
      N("client", "client", 80, 220, "users"), N("cdn", "cdn", 260, 220, "", { hitRatio: 0.85 }), N("gw", "apigw", 440, 220, "gateway"),
      N("cat", "app", 640, 120, "catalog", { replicas: 3 }), N("cache", "cache", 840, 120, "catalog-cache"),
      N("wr", "queue", 640, 340, "waiting room"), N("ord", "worker", 840, 340, "order", { replicas: 4, capacity: 100, threads: 100 }),
      N("db", "sql", 1060, 220, "inventory-db"), N("pay", "payment", 1060, 400, "payment provider")
    ], [
      E("client", "cdn"), E("cdn", "gw"), E("gw", "cat", { filter: "read" }), E("cat", "cache"), E("cache", "db"),
      E("gw", "wr", { filter: "write" }), E("wr", "ord"), E("ord", "db"), E("ord", "pay")
    ])
  });

  /* ═══ url-shortener ═══ */
  var us = D([N("client", "client", 80, 200, "users"), N("lb", "lb", 280, 200), N("app", "app", 480, 200, "shortener", { replicas: 4 }), N("db", "sql", 720, 200, "links")],
    [E("client", "lb"), E("lb", "app"), E("app", "db")]);
  add({
    id: "url-shortener",
    title: T("URL shortener (sho.rt/xyz)", "Encurtador de URLs (sho.rt/xyz)"),
    brief: T("Every order e-mail and shared post carries a short link. 5 000 redirects/s, 99% reads, a few writes (new links). The classic interview problem: what is the read path, and what store fits a key → URL lookup?",
      "Cada e-mail de pedido e post compartilhado leva um link curto. 5 000 redirecionamentos/s, 99% leituras, poucas escritas (novos links). O clássico de entrevista: qual é o caminho de leitura, e que banco serve para chave → URL?"),
    settings: { profile: "load", targetRps: 5000, readRatio: 0.99, seed: 47, chaos: "off" },
    design: us,
    goals: [G("p99", "<", 50), G("errorRate", "<", 0.1), G("costPerMonth", "<", 3500)],
    hints: [
      T("A redirect is a key lookup: a Cache with a high hit ratio in front of a key-value store.", "Um redirecionamento é uma busca por chave: um Cache com alta taxa de acerto na frente de um banco chave-valor."),
      T("Scale the app tier to ρ ≈ 0.6–0.7 and check the cost.", "Escale a aplicação para ρ ≈ 0,6–0,7 e confira o custo.")
    ],
    solution: derive(us, { dropEdges: ["app-db"], dropNodes: ["db"], set: [["app", { replicas: 13 }]], nodes: [N("cache", "cache", 720, 200, "links-cache", { hitRatio: 0.95 }), N("kv", "nosql", 960, 200, "links-kv")], edges: [E("app", "cache"), E("cache", "kv")] })
  });

  /* ═══ news-feed ═══ */
  var nf = D([N("client", "client", 80, 200, "users"), N("lb", "lb", 280, 200), N("app", "app", 480, 200, "feed", { replicas: 6 }), N("db", "sql", 740, 200, "posts (fan-out on read)", { capacity: 600, latencyMs: 40 })],
    [E("client", "lb"), E("lb", "app"), E("app", "db")]);
  add({
    id: "news-feed",
    title: T("News feed: fan-out on write vs on read", "Feed de notícias: fan-out na escrita vs na leitura"),
    brief: T("The feed shows posts from the accounts a user follows. Today the feed is assembled when it is read: a heavy query (40 ms) that merges hundreds of sources. 2 000 req/s, 95% reads. Precompute timelines when something is posted instead.",
      "O feed mostra posts das contas que o usuário segue. Hoje o feed é montado na leitura: uma consulta pesada (40 ms) que junta centenas de fontes. 2 000 req/s, 95% leituras. Em vez disso, pré-calcule as timelines quando algo é postado."),
    settings: { profile: "load", targetRps: 2000, readRatio: 0.95, seed: 53, chaos: "off" },
    design: nf,
    goals: [G("p99", "<", 100), G("errorRate", "<", 0.5), G("consumerLag", "<", 10)],
    hints: [
      T("Writes (posts): app → db (filter write) and app → Kafka; fan-out workers consume and write each follower's timeline to a NoSQL store.", "Escritas (posts): app → db (filtro write) e app → Kafka; workers de fan-out consomem e escrevem a timeline de cada seguidor num NoSQL."),
      T("Reads: app → Cache (filter read) → timelines. A read becomes one key lookup.", "Leituras: app → Cache (filtro read) → timelines. Uma leitura vira uma busca por chave."),
      T("Celebrities with millions of followers make fan-out on write expensive: real systems mix both (hybrid).", "Celebridades com milhões de seguidores tornam o fan-out na escrita caro: sistemas reais misturam os dois (híbrido).")
    ],
    solution: D([
      N("client", "client", 80, 200, "users"), N("lb", "lb", 260, 200), N("app", "app", 440, 200, "feed", { replicas: 6 }),
      N("cache", "cache", 660, 100, "timeline-cache", { hitRatio: 0.98 }), N("tl", "nosql", 1080, 100, "timelines"),
      N("db", "sql", 660, 220, "posts", { capacity: 600, latencyMs: 40 }), N("k", "kafka", 660, 340, "post-events"), N("fo", "worker", 870, 340, "fan-out", { replicas: 4 })
    ], [
      E("client", "lb"), E("lb", "app"), E("app", "cache", { filter: "read" }), E("cache", "tl"),
      E("app", "db", { filter: "write" }), E("app", "k", { filter: "write" }), E("k", "fo"), E("fo", "tl")
    ])
  });

  /* ═══ chat ═══ */
  var ch = D([N("client", "client", 80, 200, "users"), N("lb", "lb", 280, 200), N("app", "app", 480, 200, "chat (websockets)", { replicas: 6 }), N("db", "sql", 740, 120, "messages"), N("nt", "notifications", 740, 300, "delivery")],
    [E("client", "lb"), E("lb", "app"), E("app", "db"), E("app", "nt")]);
  add({
    id: "chat",
    title: T("Chat for a live event", "Chat de um evento ao vivo"),
    brief: T("During a live event, users chat in its room: 2 000 req/s, half are new messages. Each message is stored in PostgreSQL and delivered synchronously before the sender gets an answer. Writes overload the database and the sender waits for every delivery.",
      "Durante um evento ao vivo, usuários conversam na sala: 2 000 req/s, metade são mensagens novas. Cada mensagem é gravada no PostgreSQL e entregue de forma síncrona antes de o remetente ter resposta. As escritas sobrecarregam o banco e o remetente espera cada entrega."),
    settings: { profile: "load", targetRps: 2000, readRatio: 0.5, seed: 59, chaos: "off" },
    design: ch,
    goals: [G("p99", "<", 80), G("errorRate", "<", 0.1), G("consumerLag", "<", 2)],
    hints: [
      T("Store messages in a partitioned NoSQL store (append by room/time): writes scale with partitions.", "Guarde mensagens num NoSQL particionado (append por sala/tempo): escritas escalam com partições."),
      T("Publish new messages to Pub/Sub (filter write); the delivery service subscribes and pushes them to the websocket servers.", "Publique mensagens novas no Pub/Sub (filtro write); o serviço de entrega assina e as empurra para os servidores websocket.")
    ],
    solution: derive(ch, { dropEdges: ["app-db", "app-nt"], dropNodes: ["db"], set: [["nt", { replicas: 2 }]], move: [["nt", 960, 300]], nodes: [N("kv", "nosql", 740, 120, "messages"), N("ps", "pubsub", 740, 300, "room-topic")], edges: [E("app", "kv"), E("app", "ps", { filter: "write" }), E("ps", "nt")] })
  });

  /* ═══ ride-sharing ═══ */
  var rd = D([N("drivers", "mobile", 80, 200, "drivers"), N("lb", "lb", 280, 200), N("app", "app", 480, 200, "location", { replicas: 12, capacity: 2000 }), N("db", "sql", 740, 200, "positions")],
    [E("drivers", "lb"), E("lb", "app"), E("app", "db")]);
  add({
    id: "ride-sharing",
    title: T("Ride-sharing: a write-heavy geo index", "Carona: um índice geográfico com muitas escritas"),
    brief: T("Drivers send their position every 4 s: 20 000 req/s, 90% writes, while riders query nearby drivers. A relational database cannot absorb that write rate. Keep only the latest position per driver in a partitioned store and stream the history.",
      "Motoristas enviam a posição a cada 4 s: 20 000 req/s, 90% escritas, enquanto passageiros buscam motoristas próximos. Um banco relacional não absorve essa taxa de escrita. Guarde só a última posição por motorista num banco particionado e transmita o histórico."),
    settings: { profile: "load", targetRps: 20000, readRatio: 0.1, seed: 61, chaos: "off" },
    design: rd,
    goals: [G("p99", "<", 100), G("errorRate", "<", 0.5), G("costPerMonth", "<", 6000)],
    hints: [
      T("Replace the SQL database by a NoSQL store partitioned by geo cell (e.g. geohash): writes spread over partitions.", "Troque o SQL por um NoSQL particionado por célula geográfica (ex.: geohash): escritas se espalham pelas partições."),
      T("Trip history and analytics do not need to be synchronous: sample positions into Kafka and let analytics consume.", "Histórico e analytics não precisam ser síncronos: amostre posições no Kafka e deixe o analytics consumir.")
    ],
    solution: derive(rd, { dropEdges: ["app-db"], dropNodes: ["db"], nodes: [N("geo", "nosql", 740, 120, "geo-index", { replicas: 8 }), N("k", "kafka", 740, 300, "positions"), N("an", "analytics", 960, 300, "trips")], edges: [E("app", "geo"), E("app", "k", { filter: "write", ratio: 0.1 }), E("k", "an")] })
  });

  /* ═══ video-streaming ═══ */
  var vs = D([N("viewers", "client", 80, 140, "viewers", { weight: 4000, readRatio: 1 }), N("creators", "mobile", 80, 320, "uploads", { weight: 1, readRatio: 0 }),
    N("lb", "lb", 280, 220), N("app", "app", 480, 220, "media", { replicas: 4 }), N("obj", "objstore", 740, 140, "videos"),
    N("tw", "worker", 740, 320, "transcoder", { replicas: 8, capacity: 0.05, latencyMs: 20000, sigma: 0.3, threads: 1, queueLimit: 2 })],
  [E("viewers", "lb"), E("creators", "lb"), E("lb", "app"), E("app", "obj"), E("app", "tw", { filter: "write" })]);
  add({
    id: "video-streaming",
    title: T("Video streaming: CDN + object store + transcoding", "Streaming de vídeo: CDN + object store + transcodificação"),
    brief: T("Creators upload videos; users watch them. 2 000 segment requests/s from viewers go through the app, and each upload is transcoded synchronously (20 s per video) while the uploader waits. Serve segments from the edge and transcode in the background.",
      "Criadores enviam vídeos; usuários assistem. 2 000 requisições/s de segmentos passam pela aplicação, e cada upload é transcodificado de forma síncrona (20 s por vídeo) enquanto quem enviou espera. Sirva segmentos pela borda e transcodifique em segundo plano."),
    settings: { profile: "load", targetRps: 2000, readRatio: 0.99, seed: 67, chaos: "off" },
    design: vs,
    goals: [G("p99", "<", 150), G("errorRate", "<", 0.5), G("consumerLag", "<", 120)],
    hints: [
      T("Viewers → CDN → Object Store: segments are immutable, perfect for caching at the edge.", "Viewers → CDN → Object Store: segmentos são imutáveis, perfeitos para cache na borda."),
      T("Uploads: store the original, enqueue a transcoding job (app → queue → transcoder) and answer right away. Throughput of the transcoders = replicas × 1/20 s.", "Uploads: grave o original, enfileire um job (app → queue → transcoder) e responda na hora. Vazão dos transcoders = réplicas × 1/20 s.")
    ],
    solution: D([
      N("viewers", "client", 80, 120, "viewers", { weight: 4000, readRatio: 1 }), N("creators", "mobile", 80, 340, "uploads", { weight: 1, readRatio: 0 }),
      N("cdn", "cdn", 300, 120, "", { hitRatio: 0.95 }), N("gw", "apigw", 300, 340, "upload API"), N("app", "app", 500, 340, "media", { replicas: 1 }),
      N("obj", "objstore", 760, 120, "videos"), N("q", "queue", 700, 340, "transcode-jobs"),
      N("tw", "worker", 900, 340, "transcoder", { replicas: 16, capacity: 0.05, latencyMs: 20000, sigma: 0.3, threads: 1, queueLimit: 2 })
    ], [E("viewers", "cdn"), E("cdn", "obj"), E("creators", "gw"), E("gw", "app"), E("app", "obj"), E("app", "q", { filter: "write" }), E("q", "tw"), E("tw", "obj")])
  });

  /* ═══ notification-system ═══ */
  var ns = D([N("client", "client", 80, 160, "buyers"), N("sched", "scheduler", 80, 320, "daily digest", { jobs: 6000, everyS: 120, spreadS: 0 }),
    N("lb", "lb", 280, 160), N("app", "app", 480, 160, "order", { replicas: 2 }), N("nt", "notifications", 700, 240, "notification"), N("mail", "email", 920, 240, "email provider", { quota: 200 })],
  [E("client", "lb"), E("lb", "app"), E("app", "nt"), E("sched", "nt"), E("nt", "mail")]);
  add({
    id: "notification-system",
    title: T("Notification system", "Sistema de notificações"),
    brief: T("Every purchase sends a confirmation e-mail (50 req/s), and a scheduler sends 6 000 digest e-mails every 2 minutes — all at the same instant. The e-mail provider accepts 200 sends/s. Today buyers wait for the provider and fail whenever the digest burst arrives.",
      "Cada compra manda um e-mail de confirmação (50 req/s), e um agendador manda 6 000 e-mails de resumo a cada 2 minutos — todos no mesmo instante. O provedor de e-mail aceita 200 envios/s. Hoje compradores esperam o provedor e falham sempre que chega a rajada do resumo."),
    settings: { profile: "load", targetRps: 50, readRatio: 0, seed: 71, chaos: "off" },
    design: ns,
    goals: [G("errorRate", "<", 0.5), G("p99", "<", 150), G("consumerLag", "<", 120)],
    hints: [
      T("Put a Message Queue in front of the notification service: the order service only waits for the enqueue.", "Coloque uma Message Queue antes do serviço de notificações: o serviço de pedidos só espera o enfileiramento."),
      T("Spread the scheduler's jobs over a minute (jitter) instead of firing them all at once: a thundering herd is a self-inflicted spike.", "Espalhe os jobs do agendador ao longo de um minuto (jitter) em vez de dispará-los juntos: a manada é um pico autoinfligido.")
    ],
    solution: derive(ns, { dropEdges: ["app-nt", "sched-nt"], set: [["sched", { spreadS: 60 }]], move: [["nt", 880, 240], ["mail", 1100, 240]], nodes: [N("q", "queue", 680, 240, "notifications")], edges: [E("app", "q"), E("sched", "q"), E("q", "nt")] })
  });

  /* ═══ payment-system ═══ */
  var ps = D([N("client", "client", 80, 200, "buyers"), N("gw", "apigw", 280, 200, "gateway"), N("app", "app", 480, 200, "order", { replicas: 2 }), N("db", "sql", 720, 120, "order-db"),
    N("pay", "payment", 720, 300, "payment provider")],
  [E("client", "gw"), E("gw", "app"), E("app", "db"), E("app", "pay", { filter: "write", retries: 2, timeoutMs: 1000 })]);
  add({
    id: "payment-system",
    title: T("Payments: retries need idempotency", "Pagamentos: retries precisam de idempotência"),
    brief: T("Orders call the payment provider synchronously with a 1 s timeout and 2 immediate retries. At t = 60 s the provider becomes 4× slower: calls time out, and each retry after a timeout may charge the card AGAIN — the provider did receive the first attempt. Make payments safe and keep buyers fast.",
      "Pedidos chamam o provedor de pagamento de forma síncrona com timeout de 1 s e 2 retries imediatos. Em t = 60 s o provedor fica 4× mais lento: chamadas estouram o timeout, e cada retry após um timeout pode cobrar o cartão DE NOVO — o provedor recebeu a primeira tentativa. Torne os pagamentos seguros e mantenha os compradores rápidos."),
    settings: { profile: "load", targetRps: 300, readRatio: 0.5, seed: 73, chaos: "off" },
    design: ps,
    events: [{ t: 60, type: "slow", target: "pay", factor: 4, durationS: 60, label: T("payment provider 4× slower", "provedor de pagamento 4× mais lento") }],
    goals: [G("duplicates", "<", 1), G("errorRate", "<", 1), G("p99", "<", 1500)],
    hints: [
      T("Select the edge to the payment provider and turn on the idempotency key: retries become safe.", "Selecione a aresta para o provedor de pagamento e ligue a chave de idempotência: os retries ficam seguros."),
      T("Do not make the buyer wait for the provider: accept the order, enqueue the payment (app → queue → payment worker) and confirm later (webhook / e-mail).", "Não faça o comprador esperar o provedor: aceite o pedido, enfileire o pagamento (app → queue → worker) e confirme depois (webhook / e-mail).")
    ],
    solution: derive(ps, {
      dropEdges: ["app-pay"], move: [["pay", 1140, 300]],
      nodes: [N("q", "queue", 720, 300, "payments"), N("pw", "worker", 930, 300, "payment-adapter", { replicas: 2, threads: 200 })],
      edges: [E("app", "q", { filter: "write" }), E("q", "pw"), E("pw", "pay", { retries: 3, backoff: "exp+jitter", timeoutMs: 3000, idempotencyKey: true })]
    })
  });

  /* ═══ search-autocomplete ═══ */
  var sa = D([N("client", "client", 80, 200, "users typing"), N("lb", "lb", 280, 200), N("app", "app", 480, 200, "suggest", { replicas: 24 }), N("se", "search", 740, 200, "search")],
    [E("client", "lb"), E("lb", "app"), E("app", "se")]);
  add({
    id: "search-autocomplete",
    title: T("Search autocomplete", "Autocompletar da busca"),
    brief: T("Every keystroke in the search box asks for suggestions: 10 000 req/s, all reads, and they must feel instant (< 50 ms). The search cluster cannot take it. Most prefixes are popular and repeat a lot.",
      "Cada tecla na caixa de busca pede sugestões: 10 000 req/s, todas leituras, e precisam parecer instantâneas (< 50 ms). O cluster de busca não aguenta. A maioria dos prefixos é popular e se repete muito."),
    settings: { profile: "load", targetRps: 10000, readRatio: 1, seed: 79, chaos: "off" },
    design: sa,
    goals: [G("p99", "<", 50), G("errorRate", "<", 0.1), G("costPerMonth", "<", 5000)],
    hints: [
      T("Cache the suggestions per prefix (app → cache → search): the top prefixes give a very high hit ratio.", "Guarde as sugestões por prefixo em cache (app → cache → search): os prefixos mais comuns dão alta taxa de acerto."),
      T("Clients can also debounce (send after 100 ms of no typing): lower the target RPS and see the effect.", "Clientes também podem fazer debounce (enviar após 100 ms sem digitar): reduza o RPS-alvo e veja o efeito.")
    ],
    solution: derive(sa, { dropEdges: ["app-se"], set: [["se", { replicas: 2 }], ["app", { replicas: 28 }]], move: [["se", 960, 200]], nodes: [N("cache", "cache", 720, 200, "prefix-cache", { hitRatio: 0.97 })], edges: [E("app", "cache"), E("cache", "se")] })
  });

  /* ═══ ai-assistant ═══ */
  var ai = D([N("client", "client", 80, 220, "users"), N("gw", "apigw", 260, 220, "gateway"), N("orch", "orchestrator", 460, 220, "assistant", { steps: 6 }),
    N("llm", "llmgw", 700, 100, "LLM gateway", { quota: 10 }), N("tools", "toolreg", 700, 230, "tools (MCP)"), N("cat", "app", 920, 230, "catalog"),
    N("mem", "memory", 700, 360, "RAG memory"), N("vec", "vectordb", 920, 360, "doc embeddings")],
  [E("client", "gw"), E("gw", "orch"), E("orch", "llm"), E("orch", "tools"), E("tools", "cat"), E("orch", "mem"), E("mem", "vec")]);
  add({
    id: "ai-assistant",
    title: T("AI support assistant (RAG + tools)", "Assistente de suporte com IA (RAG + ferramentas)"),
    brief: T("The support assistant answers questions about products and orders. Its agent loop takes 6 steps (6 LLM calls + tool calls) per question, the provider quota is 10 calls/s, and nothing checks for prompt injection. 2 questions/s already exceed the quota, take seconds, and cost a fortune.",
      "O assistente de suporte responde perguntas sobre produtos e pedidos. Seu laço de agente faz 6 passos (6 chamadas ao LLM + ferramentas) por pergunta, a cota do provedor é de 10 chamadas/s, e nada verifica prompt injection. 2 perguntas/s já estouram a cota, levam segundos e custam uma fortuna."),
    settings: { profile: "load", targetRps: 2, readRatio: 1, seed: 83, chaos: "off" },
    design: ai,
    goals: [G("errorRate", "<", 1), G("p99", "<", 10000), G("costPerMonth", "<", 60000), G("unsafeRate", "<", 0.1)],
    hints: [
      T("Fewer agent steps: a good retrieval step (RAG) answers most questions in 2–3 LLM calls. Latency and cost scale with the steps.", "Menos passos: uma boa etapa de recuperação (RAG) responde a maioria em 2–3 chamadas. Latência e custo crescem com os passos."),
      T("Turn on the LLM gateway's semantic cache (users ask the same things) and a fallback model for when the provider throttles.", "Ligue o cache semântico do LLM gateway (usuários perguntam as mesmas coisas) e um modelo reserva para quando o provedor limitar."),
      T("Put a Safety Mesh in the path (gateway → safety → assistant): every prompt goes through the guardrails.", "Coloque um Safety Mesh no caminho (gateway → safety → assistant): todo prompt passa pelos guardrails.")
    ],
    solution: derive(ai, {
      dropEdges: ["gw-orch"], set: [["orch", { steps: 3 }], ["llm", { semanticCacheHit: 0.3, fallbackModel: true }]],
      move: [["gw", 250, 220], ["orch", 590, 220], ["llm", 800, 100], ["tools", 800, 230], ["cat", 1000, 230], ["mem", 800, 360], ["vec", 1000, 360]],
      nodes: [N("safe", "safety", 420, 220, "guardrails")], edges: [E("gw", "safe"), E("safe", "orch")]
    })
  });

  /* ═══ observability-stack ═══ */
  var ob = D([N("client", "client", 80, 200, "users"), N("lb", "lb", 280, 200), N("app", "app", 480, 200, "catalog", { replicas: 3 }), N("db", "sql", 720, 200, "catalog-db")],
    [E("client", "lb"), E("lb", "app"), E("app", "db")]);
  add({
    id: "observability-stack",
    title: T("You can't fix what you don't measure", "Não se conserta o que não se mede"),
    brief: T("Utilization is hidden (\"?\") until a service is connected to Metrics. At t = 50 s one catalog replica dies; without health checks the load balancer notices only after 30 s, and without alerting nobody repairs it quickly. Wire the observability stack: metrics on every service, health checks, alerting, logs and tracing.",
      "A utilização fica oculta (\"?\") até o serviço ser ligado ao Metrics. Em t = 50 s uma réplica do catálogo morre; sem health checks o balanceador só percebe após 30 s, e sem alertas ninguém a repara logo. Monte a pilha de observabilidade: métricas em todo serviço, health checks, alertas, logs e tracing."),
    settings: { profile: "load", targetRps: 600, readRatio: 0.9, seed: 89, chaos: "off" },
    godMode: false,
    design: ob,
    events: [{ t: 50, type: "crash", target: "app", durationS: 80, label: T("a catalog replica dies", "uma réplica do catálogo morre") }],
    goals: [G("availability", ">=", 99), G("p99", "<", 200), G("observed", ">=", 100)],
    hints: [
      T("Add Metrics and connect it to the load balancer, the app and the database (edges in either direction).", "Adicione Metrics e conecte ao balanceador, à aplicação e ao banco (arestas em qualquer direção)."),
      T("A Health Check connected to the load balancer cuts detection from 30 s to 3 s; Alerting connected to Metrics halves the time to repair.", "Um Health Check ligado ao balanceador reduz a detecção de 30 s para 3 s; Alerting ligado ao Metrics reduz pela metade o tempo de reparo."),
      T("Add Tracing to get the Trace tab (where does a slow request spend its time?) and Logs to see event details.", "Adicione Tracing para ter a aba Trace (onde uma requisição lenta gasta seu tempo?) e Logs para ver detalhes dos eventos.")
    ],
    solution: derive(ob, {
      nodes: [N("m", "metrics", 480, 360), N("hc", "healthcheck", 280, 360), N("al", "alerting", 700, 360), N("tr", "tracing", 480, 60), N("lg", "logs", 700, 60)],
      edges: [E("lb", "m"), E("app", "m"), E("db", "m"), E("hc", "lb"), E("al", "m"), E("app", "tr"), E("app", "lg")]
    })
  });

  /* ═══ microservices ═══ */
  var ms = D([N("client", "client", 80, 250, "users"), N("gw", "apigw", 270, 250, "gateway"),
    N("catalog", "microservice", 510, 140, "catalog", { replicas: 6, capacity: 250, autoscale: true, minReplicas: 6, maxReplicas: 30 }),
    N("order", "microservice", 510, 360, "order", { autoscale: true, minReplicas: 2, maxReplicas: 10 }),
    N("inventory", "microservice", 740, 300, "inventory", { autoscale: true, minReplicas: 2, maxReplicas: 10 }),
    N("notify", "microservice", 740, 420, "notify", { latencyMs: 120, sigma: 0.6, autoscale: true, minReplicas: 2, maxReplicas: 10 }),
    N("catdb", "sql", 1010, 140, "catalog-db", { readReplicas: 1 }), N("invdb", "sql", 1010, 300, "inventory-db"), N("orddb", "sql", 1010, 420, "order-db")],
  [E("client", "gw"), E("gw", "catalog", { filter: "read" }), E("gw", "order", { filter: "write" }), E("catalog", "catdb"),
    E("order", "inventory"), E("order", "catalog"), E("order", "notify"), E("order", "orddb"), E("inventory", "invdb")],
  [K("cluster", 400, 70, 470, 420, "prod", { nodes: 2, podsPerNode: 6 })]);
  add({
    id: "microservices",
    title: T("Microservices on Kubernetes: pods vs nodes", "Microsserviços no Kubernetes: pods vs nós"),
    brief: T("The app was split into catalog, inventory, order and notify microservices, each with its own database, behind an API gateway, on a Kubernetes cluster of 2 nodes × 6 pods. At 2 000 req/s the catalog's HPA asks for more pods than the cluster can schedule: they stay Pending, and the catalog drowns. Buying is a synchronous chain (order → inventory, catalog, notify, its DB): every hop adds its latency to the buyer's wait.",
      "A aplicação foi dividida nos microsserviços catalog, inventory, order e notify, cada um com seu banco, atrás de um API gateway, num cluster Kubernetes de 2 nós × 6 pods. Com 2 000 req/s o HPA do catálogo pede mais pods do que o cluster consegue alocar: eles ficam Pending, e o catálogo afoga. Comprar é uma cadeia síncrona (order → inventory, catalog, notify, seu banco): cada salto soma sua latência à espera do comprador."),
    settings: { profile: "load", targetRps: 2000, readRatio: 0.8, seed: 2031, chaos: "off" },
    design: ms,
    goals: [G("errorRate", "<", 1), G("p99", "<", 200), G("costPerMonth", "<", 8500)],
    hints: [
      T("Select the cluster frame: pods = nodes × pods per node. The HPA only adds pods; when they do not fit they are Pending. Add nodes, or turn on the cluster autoscaler (a new node takes ~90 s, so keep some headroom too).", "Selecione a moldura do cluster: pods = nós × pods por nó. O HPA só adiciona pods; quando não cabem, ficam Pending. Adicione nós ou ligue o cluster autoscaler (um nó novo leva ~90 s, então mantenha alguma folga também)."),
      T("Look at the Trace tab (add Tracing) or think: the buyer waits for order + inventory + catalog + notify + the database. Does the confirmation have to be sent before answering? Put a queue between order and notify.", "Olhe a aba Trace (adicione Tracing) ou pense: o comprador espera order + inventory + catalog + notify + o banco. A confirmação precisa sair antes da resposta? Coloque uma fila entre order e notify."),
      T("Do not buy nodes you do not need: each one is ≈ 140 USD/month. A cache in front of the catalog would also cut the pods it needs.", "Não compre nós que não precisa: cada um custa ≈ 140 USD/mês. Um cache na frente do catálogo também reduziria os pods de que ele precisa.")
    ],
    solution: derive(ms, {
      setFrames: [["cluster", { nodes: 3, clusterAutoscaler: true, maxNodes: 6 }]],
      set: [["catalog", { replicas: 10, minReplicas: 10 }]],
      dropEdges: ["order-notify"],
      nodes: [N("mq", "queue", 630, 570, "confirmations")],
      edges: [E("order", "mq"), E("mq", "notify")]
    })
  });

  /* ═══ k8s-node-failure ═══ */
  var kn = D([N("client", "client", 80, 220, "users"), N("lb", "lb", 270, 220, "ingress LB"),
    N("catalog", "microservice", 500, 220, "catalog", { replicas: 6 }), N("pricing", "microservice", 740, 220, "pricing", { replicas: 6 }),
    N("db", "sql", 980, 220, "catalog-db", { readReplicas: 1 })],
  [E("client", "lb"), E("lb", "catalog"), E("catalog", "pricing"), E("catalog", "db")],
  [K("cluster", 400, 110, 470, 220, "prod", { nodes: 3, podsPerNode: 4 })]);
  add({
    id: "k8s-node-failure",
    title: T("Kubernetes: losing a node", "Kubernetes: perdendo um nó"),
    brief: T("Catalog and pricing run 6 pods each on a cluster of 3 nodes × 4 pods: completely full. At t = 60 s a worker node dies and takes a third of the pods with it. Callers keep sending requests to the dead pods until they notice (30 s behind the load balancer, 40 s for the direct catalog → pricing call), and the lost pods have nowhere to be rescheduled. Survive the loss of any one node.",
      "Catalog e pricing rodam 6 pods cada num cluster de 3 nós × 4 pods: completamente cheio. Em t = 60 s um nó morre e leva um terço dos pods. Quem chama continua mandando requisições aos pods mortos até perceber (30 s atrás do balanceador, 40 s na chamada direta catalog → pricing), e os pods perdidos não têm onde ser realocados. Sobreviva à perda de qualquer nó."),
    settings: { profile: "load", targetRps: 1700, readRatio: 0.9, seed: 2033, chaos: "off" },
    design: kn,
    events: [{ t: 60, type: "nodeFail", target: "cluster", durationS: 600, label: T("a worker node dies", "um nó de trabalho morre") }],
    goals: [G("errorRate", "<", 1), G("p99", "<", 150), G("costPerMonth", "<", 2000)],
    hints: [
      T("N+1 for nodes: leave room in the cluster for the pods of one node (more pods per node, or one more node), so the lost pods can be rescheduled at once.", "N+1 para nós: deixe espaço no cluster para os pods de um nó (mais pods por nó, ou um nó a mais), para que os pods perdidos sejam realocados na hora."),
      T("Size the replicas so that the survivors carry the load while the lost pods restart (ρ after losing a third of them below ~0.85), and put a timeout with retries on catalog → pricing: a call to a dead pod hangs and holds a thread.", "Dimensione as réplicas para que as sobreviventes aguentem a carga enquanto os pods perdidos reiniciam (ρ após perder um terço delas abaixo de ~0,85), e coloque timeout com retries em catalog → pricing: uma chamada a um pod morto trava e segura uma thread."),
      T("Connect a Service Registry to catalog and pricing (or a Health Check to the load balancer): callers stop using dead pods in 3 s instead of 30–40 s.", "Conecte um Service Registry a catalog e pricing (ou um Health Check ao balanceador): quem chama para de usar pods mortos em 3 s em vez de 30–40 s.")
    ],
    solution: derive(kn, {
      setFrames: [["cluster", { podsPerNode: 8 }]],
      set: [["catalog", { replicas: 8 }], ["pricing", { replicas: 8 }]],
      edgeParams: [["catalog-pricing", { timeoutMs: 300, retries: 2 }]],
      nodes: [N("reg", "registry", 620, 420, "discovery")],
      edges: [E("reg", "catalog"), E("reg", "pricing")]
    })
  });

  /* ═══ db-failover ═══ */
  var dbf = D([N("client", "client", 80, 220, "buyers"), N("lb", "lb", 270, 220), N("app", "app", 470, 220, "checkout", { replicas: 6 }),
    N("db", "dbcluster", 700, 220, "orders-db", { replicasPerShard: 1, replication: "async", failoverS: 30 })],
  [E("client", "lb"), E("lb", "app"), E("app", "db")]);
  add({
    id: "db-failover",
    title: T("Database failover: RTO and RPO", "Failover do banco: RTO e RPO"),
    brief: T("Flash-sale checkout: 1 500 req/s, half of them writes (orders), on a DB Cluster with one primary and one follower replicated asynchronously. At t = 90 s the primary dies. Until a follower is promoted (30 s) every write fails, and the writes still inside the replication lag are lost for good: orders paid and forgotten. Make the failover lose nothing and hurt little.",
      "Checkout da venda relâmpago: 1 500 req/s, metade escritas (pedidos), num DB Cluster com um primário e um seguidor replicado de forma assíncrona. Em t = 90 s o primário morre. Até um seguidor ser promovido (30 s) toda escrita falha, e as escritas ainda dentro do atraso de replicação se perdem de vez: pedidos pagos e esquecidos. Faça o failover não perder nada e doer pouco."),
    settings: { profile: "load", targetRps: 1500, readRatio: 0.5, seed: 2035, chaos: "off" },
    design: dbf,
    events: [{ t: 90, type: "primaryFail", target: "db", shard: 0, label: T("the primary of orders-db dies", "o primário de orders-db morre") }],
    goals: [G("lostWrites", "<", 1), G("availability", ">=", 99), G("p99Write", "<", 100)],
    hints: [
      T("Lost writes ≈ write rate × replication lag at the moment of the failure (the RPO). Replication sync or quorum: a write is acknowledged only when a follower has it — nothing is lost, every write pays a round trip.", "Escritas perdidas ≈ taxa de escrita × atraso de replicação no momento da falha (o RPO). Replicação sync ou quorum: uma escrita só é confirmada quando um seguidor a tem — nada se perde, toda escrita paga uma ida e volta."),
      T("Availability: every second of failover is a second of failed writes (the RTO). Shorten the failover time, and split the keys into shards so a dead primary takes only part of the writes.", "Disponibilidade: cada segundo de failover é um segundo de escritas falhando (o RTO). Reduza o tempo de failover e divida as chaves em shards para que um primário morto leve só parte das escritas."),
      T("Quorum with 2 followers waits for the fastest of them: inject a latency degradation on the cluster (it slows one follower) and compare sync and quorum on the write p99.", "Quorum com 2 seguidores espera o mais rápido deles: injete uma degradação de latência no cluster (ela deixa um seguidor lento) e compare sync e quorum no p99 de escrita.")
    ],
    solution: derive(dbf, { set: [["db", { shards: 2, replicasPerShard: 2, replication: "quorum", failoverS: 5 }]] })
  });

  /* ════════════════════════════════════════════════════════════════════
     BoxOffice (2027.1): the course's system, chapter by chapter and lab by
     lab, with the names and numbers of the class pages and of the lab code
     (docs/2027.1/hands-on/<n>/code/). These presets support embedded course
     exercises only; they are not part of the app's scenario menu.
     ════════════════════════════════════════════════════════════════════ */
  function BO(s) { s.group = "boxoffice"; s.courseOnly = true; COURSE.push(s); }
  function CASE(s) { s.group = "case"; add(s); }

  /* ═══ boxoffice-onsale (class 2, estimation) ═══ */
  var boOn = D([N("fans", "client", 80, 220, "fans"), N("gw", "apigw", 280, 220, "gateway", { replicas: 4 }),
    N("inv", "app", 500, 220, "inventory", { replicas: 80 }),
    N("db", "sql", 740, 220, "inventory-db", { capacity: 1600, latencyMs: 5, threads: 8, writeCost: 1 })],
  [E("fans", "gw"), E("gw", "inv"), E("inv", "db")]);
  BO({
    id: "boxoffice-onsale",
    title: T("BoxOffice: the 10:00 on-sale on one database", "BoxOffice: a abertura das 10:00 em um banco"),
    brief: T("At 10:00 two million fans try to hold seats in the first minute: ≈ 33 000 holds/s against an inventory database that does 1 600/s at 100% (5 ms per hold, 8 connections) and ≈ 1 100/s at a sane 70%. Eighty inventory replicas do not help: every hold ends in the same database. Keep holds under 300 ms and put the excess in a line instead of turning it into errors.",
      "Às 10:00 dois milhões de fãs tentam reservar assentos no primeiro minuto: ≈ 33 000 reservas/s contra um banco de inventário que faz 1 600/s a 100% (5 ms por reserva, 8 conexões) e ≈ 1 100/s a uns sensatos 70%. Oitenta réplicas do inventário não ajudam: toda reserva termina no mesmo banco. Mantenha as reservas abaixo de 300 ms e coloque o excesso numa fila em vez de transformá-lo em erros."),
    settings: { profile: "load", targetRps: 1000, readRatio: 0, seed: 2027, chaos: "off" },
    design: boOn,
    events: [{ t: 60, type: "viral", factor: 33, durationS: 60, label: T("10:00: the sale opens (2 M fans in 60 s)", "10:00: abre a venda (2 M de fãs em 60 s)") }],
    goals: [G("errorRate", "<", 1), G("p99", "<", 300)],
    hints: [
      T("Capacity of the database: c / S = 8 / 5 ms = 1 600 holds/s. Demand: 2 000 000 / 60 s ≈ 33 000/s. No number of replicas in front closes a 20× gap.", "Capacidade do banco: c / S = 8 / 5 ms = 1 600 reservas/s. Demanda: 2 000 000 / 60 s ≈ 33 000/s. Nenhuma quantidade de réplicas na frente fecha uma diferença de 20×."),
      T("A waiting room: gateway → Message Queue → inventory workers that admit ≈ 1 000 holds/s (ρ ≈ 0.63 on the database). The consumer lag is how long a fan waits in line.", "Uma sala de espera: gateway → Message Queue → workers do inventário que admitem ≈ 1 000 reservas/s (ρ ≈ 0,63 no banco). O atraso do consumidor é quanto o fã espera na fila.")
    ],
    solution: derive(boOn, {
      dropEdges: ["gw-inv"], dropNodes: ["inv"], move: [["db", 960, 220]],
      nodes: [N("wr", "queue", 500, 220, "waiting room", { capacity: 50000 }), N("inv", "worker", 730, 220, "inventory", { replicas: 10, capacity: 100, latencyMs: 2, threads: 20 })],
      edges: [E("gw", "wr"), E("wr", "inv"), E("inv", "db")]
    })
  });

  /* ═══ boxoffice-pool (labs 1–2) ═══ */
  var boPool = D([N("fans", "client", 80, 200, "k6 (stress.js)"), N("cat", "app", 320, 200, "catalog", { capacity: 800 }),
    N("db", "sql", 580, 200, "catalog-db", { threads: 10, latencyMs: 18 })],
  [E("fans", "cat"), E("cat", "db")]);
  BO({
    id: "boxoffice-pool",
    title: T("BoxOffice lab 2: the knee of the connection pool", "BoxOffice lab 2: o joelho do pool de conexões"),
    brief: T("Labs 1–2: one catalog (1 CPU) and its PostgreSQL, with the default pool of 10 connections. stress.js ramps up to 600 req/s: p99 is flat up to ≈ 300 req/s, 224 ms at 400 and 2 s at 500, while the CPU is far from full. Little's Law: 10 connections ÷ ≈ 20 ms per query ≈ 480 queries/s. Find the knee, then move it past 600 req/s.",
      "Labs 1–2: um catalog (1 CPU) e seu PostgreSQL, com o pool padrão de 10 conexões. O stress.js sobe até 600 req/s: o p99 fica plano até ≈ 300 req/s, vai a 224 ms em 400 e a 2 s em 500, enquanto a CPU está longe de cheia. Lei de Little: 10 conexões ÷ ≈ 20 ms por consulta ≈ 480 consultas/s. Encontre o joelho e depois leve-o para além de 600 req/s."),
    settings: { profile: "breakpoint", targetRps: 150, readRatio: 1, seed: 2002, chaos: "off" },
    design: boPool,
    goals: [G("breakingPoint", ">=", 550), G("p99", "<", 500)],
    hints: [
      T("Open the Report: the bottleneck is catalog-db, and the reason is connections, not CPU. Threads waiting for a connection (db_pending in the lab) queue behind 10 slots.", "Abra o Relatório: o gargalo é o catalog-db e o motivo são as conexões, não a CPU. Threads esperando uma conexão (db_pending no lab) fazem fila atrás de 10 vagas."),
      T("Select catalog-db and raise its connections to 30, as the lab does with DB_POOL_SIZE=30: the knee moves to ≈ 1 400 queries/s and the catalog CPU (800 req/s) becomes the limit.", "Selecione o catalog-db e aumente as conexões para 30, como o lab faz com DB_POOL_SIZE=30: o joelho vai para ≈ 1 400 consultas/s e a CPU do catalog (800 req/s) vira o limite.")
    ],
    solution: derive(boPool, { set: [["db", { threads: 30 }]] })
  });

  /* ═══ boxoffice-edge (lab 3) ═══ */
  var boEdge = D([N("fans", "client", 80, 200, "fans + a greedy key", { botShare: 2 }), N("edge", "lb", 290, 200, "edge (nginx)"),
    N("cat", "app", 500, 200, "catalog"), N("db", "sql", 740, 200, "catalog-db", { threads: 30 })],
  [E("fans", "edge"), E("edge", "cat"), E("cat", "db")]);
  BO({
    id: "boxoffice-edge",
    title: T("BoxOffice lab 3: the edge (Nginx), replicas and limit_req", "BoxOffice lab 3: a borda (Nginx), réplicas e limit_req"),
    brief: T("Lab 3: Nginx in front of the catalog. 400 req/s of fans, plus one greedy API key that sends twice that, on a single catalog replica (≈ 500 req/s). At t = 80 s a replica is stopped for 20 s (docker stop catalog-2). Keep p99 under 300 ms (the lab's capacity criterion) and errors under 1%.",
      "Lab 3: Nginx na frente do catalog. 400 req/s de fãs, mais uma chave de API gananciosa que manda o dobro disso, numa única réplica do catalog (≈ 500 req/s). Em t = 80 s uma réplica é parada por 20 s (docker stop catalog-2). Mantenha o p99 abaixo de 300 ms (o critério de capacidade do lab) e os erros abaixo de 1%."),
    settings: { profile: "load", targetRps: 400, readRatio: 0.95, seed: 2003, chaos: "off" },
    design: boEdge,
    events: [{ t: 80, type: "crash", target: "cat", durationS: 20, label: T("docker stop catalog-2 (20 s)", "docker stop catalog-2 (20 s)") }],
    goals: [G("errorRate", "<", 1), G("p99", "<", 300)],
    hints: [
      T("Three catalog replicas (catalog-1/2/3 in the lab's compose) behind the edge. With max_fails=3 fail_timeout=10s Nginx stops sending to a dead replica after a few failures: connect a Health Check to the edge (3 s instead of 30 s).", "Três réplicas do catalog (catalog-1/2/3 no compose do lab) atrás da borda. Com max_fails=3 fail_timeout=10s o Nginx para de mandar para uma réplica morta após poucas falhas: conecte um Health Check à borda (3 s em vez de 30 s)."),
      T("Replicas alone are not enough: with one stopped, 2 × 500 req/s cannot carry 1 200 req/s. The lab limits each key (limit_req 20 r/s, burst 40, 429): set a rate limit of 600 req/s on the edge. The heaviest client is cut first.", "Só réplicas não bastam: com uma parada, 2 × 500 req/s não aguentam 1 200 req/s. O lab limita cada chave (limit_req 20 r/s, burst 40, 429): defina um limite de 600 req/s na borda. O cliente mais pesado é cortado primeiro.")
    ],
    solution: derive(boEdge, { set: [["cat", { replicas: 3 }], ["edge", { rateLimit: 600 }]], nodes: [N("hc", "healthcheck", 290, 340, "max_fails")], edges: [E("hc", "edge")] })
  });

  /* ═══ boxoffice-gateway (lab 4) ═══ */
  var boGw = D([N("fans", "client", 80, 220, "fans"), N("edge", "lb", 250, 220, "edge (nginx)"), N("gw", "apigw", 430, 220, "gateway"),
    N("cat", "app", 650, 120, "catalog", { replicas: 3 }), N("db", "sql", 880, 120, "catalog-db", { threads: 30 }),
    N("auth", "auth", 650, 330, "auth (BCrypt)", { capacity: 12.5, latencyMs: 80 })],
  [E("fans", "edge"), E("edge", "gw"), E("gw", "cat", { filter: "read" }), E("cat", "db"),
    E("gw", "auth", { filter: "write", timeoutMs: 5000, retries: 1 })]);
  BO({
    id: "boxoffice-gateway",
    title: T("BoxOffice lab 4: the login rush at the gateway", "BoxOffice lab 4: a corrida de logins no gateway"),
    brief: T("Lab 4: the gateway validates JSON Web Tokens (JWTs, signed with RS256) by itself, so only logins reach auth — and a login is expensive on purpose: BCrypt cost 10, ≈ 80 ms of CPU, so one auth replica does 10 logins/s at 80% CPU and collapses at 20/s. 200 req/s with 5% logins; at t = 60 s everybody logs in before the sale (3× for 30 s). The gateway waits 5 s and retries once.",
      "Lab 4: o gateway valida JSON Web Tokens (JWTs, assinados com RS256) sozinho, então só logins chegam ao auth — e um login é caro de propósito: BCrypt custo 10, ≈ 80 ms de CPU, então uma réplica do auth faz 10 logins/s a 80% de CPU e desaba a 20/s. 200 req/s com 5% de logins; em t = 60 s todos fazem login antes da venda (3× por 30 s). O gateway espera 5 s e retenta uma vez."),
    settings: { profile: "spike", targetRps: 200, readRatio: 0.95, seed: 2004, chaos: "off", spikeFactor: 3 },
    design: boGw,
    goals: [G("errorRate", "<", 1), G("p99", "<", 500)],
    hints: [
      T("ρ(auth) = 30 logins/s ÷ 12.5 per replica = 2.4 during the rush: size auth for the peak, not for the average (4 replicas → ρ ≈ 0.6).", "ρ(auth) = 30 logins/s ÷ 12.5 por réplica = 2,4 durante a corrida: dimensione o auth para o pico, não para a média (4 réplicas → ρ ≈ 0,6)."),
      T("Look at the edge gateway → auth: a retry after a 5 s timeout lands on the same overloaded auth. Do not lower the BCrypt cost to go faster: it is what makes stolen hashes slow to crack.", "Observe a aresta gateway → auth: um retry após um timeout de 5 s cai no mesmo auth sobrecarregado. Não reduza o custo do BCrypt para ganhar velocidade: é ele que torna hashes roubados lentos de quebrar.")
    ],
    solution: derive(boGw, { set: [["auth", { replicas: 4 }]] })
  });

  /* ═══ boxoffice-cache (lab 5) ═══ */
  var boCa = D([N("fans", "client", 80, 200, "fans"), N("edge", "lb", 270, 200, "edge (nginx)"), N("cat", "app", 470, 200, "catalog", { replicas: 4 }),
    N("db", "sql", 740, 200, "catalog-db", { capacity: 1000, threads: 30 })],
  [E("fans", "edge"), E("edge", "cat"), E("cat", "db")]);
  BO({
    id: "boxoffice-cache",
    title: T("BoxOffice lab 5: cache-aside on Redis", "BoxOffice lab 5: cache-aside no Redis"),
    brief: T("Lab 5: event pages are read ~100× more than they change. 1 500 req/s (the top of the lab's sweep) through the edge and four catalog replicas: the replicas are fine, catalog-db is not. Add Redis with cache-aside (event TTL 60 s). At t = 100 s Redis restarts empty: does the database survive the stampede?",
      "Lab 5: as páginas de eventos são lidas ~100× mais do que mudam. 1 500 req/s (o topo da varredura do lab) pela borda e quatro réplicas do catalog: as réplicas aguentam, o catalog-db não. Adicione o Redis com cache-aside (TTL de evento de 60 s). Em t = 100 s o Redis reinicia vazio: o banco sobrevive à avalanche?"),
    settings: { profile: "load", targetRps: 1500, readRatio: 0.99, seed: 2005, chaos: "off" },
    design: boCa,
    events: [{ t: 100, type: "flush", targetType: "cache", label: T("Redis restarts empty", "o Redis reinicia vazio") }],
    goals: [G("p99", "<", 200), G("errorRate", "<", 0.5)],
    hints: [
      T("catalog → Cache (redis) → catalog-db. DB reads = reads × (1 − hit ratio): with the lab's ≈ 80% hits, 1 500 req/s become ≈ 300 queries/s. The cache refills within one TTL (60 s).", "catalog → Cache (redis) → catalog-db. Leituras no banco = leituras × (1 − taxa de acerto): com os ≈ 80% de acertos do lab, 1 500 req/s viram ≈ 300 consultas/s. O cache se reenche em um TTL (60 s)."),
      T("After the restart every key misses at once. Turn on coalescing: it is the lab's stampede lock (SET NX PX 2000), so one request per key goes to the database while the others wait for it.", "Depois do reinício toda chave erra ao mesmo tempo. Ligue a coalescência: é a trava contra stampede do lab (SET NX PX 2000), então uma requisição por chave vai ao banco enquanto as outras esperam por ela.")
    ],
    solution: derive(boCa, { dropEdges: ["cat-db"], move: [["db", 960, 200]], nodes: [N("redis", "cache", 720, 200, "redis", { hitRatio: 0.8, cacheWarmS: 60, coalescing: true })], edges: [E("cat", "redis"), E("redis", "db")] })
  });

  /* ═══ boxoffice-read-your-writes (lab 6) ═══ */
  var boRyw = D([N("fans", "client", 80, 200, "fans"), N("gw", "apigw", 280, 200, "gateway"), N("inv", "app", 480, 200, "inventory", { replicas: 2 }),
    N("db", "dbcluster", 720, 200, "inventory-db", { replicasPerShard: 1, replication: "async", readsFrom: "followers", applyDelayS: 1, failoverS: 30 })],
  [E("fans", "gw"), E("gw", "inv"), E("inv", "db")]);
  BO({
    id: "boxoffice-read-your-writes",
    title: T("BoxOffice lab 6: the replica that lies", "BoxOffice lab 6: a réplica que mente"),
    brief: T("Lab 6: inventory writes holds to the primary and reads them back from a replica that applies the log 1 s late (REPLICA_DELAY=1s). 200 req/s, half holds and half \"my holds\" reads: a fan who has just held a seat does not see it. At t = 90 s the primary dies and the replica is promoted after 30 s: the holds still inside the lag are gone.",
      "Lab 6: o inventory grava reservas no primário e as relê de uma réplica que aplica o log 1 s atrasada (REPLICA_DELAY=1s). 200 req/s, metade reservas e metade leituras de \"minhas reservas\": um fã que acabou de reservar um assento não o vê. Em t = 90 s o primário morre e a réplica é promovida após 30 s: as reservas ainda dentro do atraso somem."),
    settings: { profile: "load", targetRps: 200, readRatio: 0.5, seed: 2006, chaos: "off" },
    design: boRyw,
    events: [{ t: 90, type: "primaryFail", target: "db", shard: 0, label: T("the primary of inventory-db dies", "o primário de inventory-db morre") }],
    goals: [G("staleReads", "<", 1), G("lostWrites", "<", 1)],
    hints: [
      T("Read your writes: send the reads that follow a write to the primary (Reads from = primary), as the lab does for \"my holds\".", "Leia o que escreveu: mande ao primário as leituras que seguem uma escrita (Leituras de = primary), como o lab faz em \"minhas reservas\"."),
      T("Lost holds ≈ write rate × lag. Replication sync (remote_apply in the lab) acknowledges a hold only after the replica has applied it: nothing is lost, and every hold now waits the 1 s delay — compare the write p99 in the Report (the lab measured 2 s per iteration).", "Reservas perdidas ≈ taxa de escrita × atraso. Replicação sync (remote_apply no lab) só confirma uma reserva depois que a réplica a aplicou: nada se perde e toda reserva passa a esperar o atraso de 1 s — compare o p99 de escrita no Relatório (o lab mediu 2 s por iteração).")
    ],
    solution: derive(boRyw, { set: [["db", { replication: "sync", readsFrom: "primary" }]] })
  });

  /* ═══ boxoffice-outbox (lab 7) ═══ */
  var boOb = D([N("fans", "client", 80, 200, "fans"), N("gw", "apigw", 260, 200, "gateway"), N("ord", "app", 460, 200, "order"),
    N("db", "sql", 700, 100, "order-db", { threads: 10 }),
    N("nt", "notifications", 700, 300, "notification", { replicas: 3, capacity: 20, latencyMs: 50, threads: 1, queueLimit: 5 })],
  [E("fans", "gw"), E("gw", "ord"), E("ord", "db"), E("ord", "nt")]);
  BO({
    id: "boxoffice-outbox",
    title: T("BoxOffice lab 7: the outbox and Kafka", "BoxOffice lab 7: o outbox e o Kafka"),
    brief: T("Lab 7: today order calls notification synchronously, and notification sends each e-mail in 50 ms with 3 consumers: at most 60 e-mails/s. orders-load.js sends 50 orders/s; at t = 60 s a burst of 200/s lasts 30 s. The buyer waits for the e-mail and fails when it cannot be sent. Keep orders under 200 ms and let the e-mails catch up within a minute.",
      "Lab 7: hoje o order chama o notification de forma síncrona e o notification envia cada e-mail em 50 ms com 3 consumidores: no máximo 60 e-mails/s. O orders-load.js manda 50 pedidos/s; em t = 60 s uma rajada de 200/s dura 30 s. O comprador espera o e-mail e falha quando ele não pode ser enviado. Mantenha os pedidos abaixo de 200 ms e deixe os e-mails se atualizarem em até um minuto."),
    settings: { profile: "spike", targetRps: 50, readRatio: 0, seed: 2007, chaos: "off", spikeFactor: 4 },
    design: boOb,
    goals: [G("errorRate", "<", 0.5), G("p99", "<", 200), G("consumerLag", "<", 60)],
    hints: [
      T("Write the order and an OrderPlaced row in the same transaction (the outbox); the relay publishes it to Kafka (order → kafka order-events, 6 partitions) and notification consumes it (kafka → notification). The buyer no longer waits for the e-mail.", "Grave o pedido e uma linha OrderPlaced na mesma transação (o outbox); o relay a publica no Kafka (order → kafka order-events, 6 partições) e o notification a consome (kafka → notification). O comprador não espera mais o e-mail."),
      T("Lag = backlog ÷ drain rate. With 3 consumers × 20/s the burst leaves ≈ 4 000 messages (≈ 70 s of lag). Raise the consumers to 6 — the number of partitions: more than 6 would sit idle.", "Atraso = backlog ÷ taxa de drenagem. Com 3 consumidores × 20/s a rajada deixa ≈ 4 000 mensagens (≈ 70 s de atraso). Aumente os consumidores para 6 — o número de partições: mais de 6 ficariam ociosos.")
    ],
    solution: derive(boOb, {
      dropEdges: ["ord-nt"], set: [["nt", { replicas: 6 }]], move: [["nt", 920, 300]],
      nodes: [N("k", "kafka", 700, 300, "order-events", { replicas: 1, partitions: 6 })], edges: [E("ord", "k"), E("k", "nt")]
    })
  });

  /* ═══ boxoffice-tickets-pdf (classes 5 and 8: workers behind a queue) ═══ */
  var boPdf = D([N("fans", "client", 80, 200, "buyers"), N("gw", "apigw", 260, 200, "gateway"), N("ord", "app", 450, 200, "order", { replicas: 2 }),
    N("q", "queue", 650, 200, "ticket-jobs"), N("pdf", "worker", 850, 200, "ticket-pdf", { replicas: 20, capacity: 2.5, latencyMs: 350, sigma: 0.3, threads: 1, queueLimit: 2 }),
    N("obj", "objstore", 1060, 200, "tickets (PDF)")],
  [E("fans", "gw"), E("gw", "ord"), E("ord", "q"), E("q", "pdf"), E("pdf", "obj")]);
  BO({
    id: "boxoffice-tickets-pdf",
    title: T("BoxOffice: how many PDF workers?", "BoxOffice: quantos workers de PDF?"),
    brief: T("After the on-sale, 30 000 orders arrive in 3 minutes (≈ 167/s). Each ticket is rendered to a PDF in 0.4 s by a worker that takes jobs from a queue. With 20 workers (50 PDFs/s) the backlog reaches ≈ 21 000 jobs and drains in ≈ 7 minutes: fans wait for their tickets. Little's Law: busy workers = 167 × 0.4 ≈ 67. Deliver every ticket within a minute.",
      "Depois da abertura, 30 000 pedidos chegam em 3 minutos (≈ 167/s). Cada ingresso vira um PDF em 0,4 s num worker que tira jobs de uma fila. Com 20 workers (50 PDFs/s) o backlog chega a ≈ 21 000 jobs e drena em ≈ 7 minutos: os fãs esperam seus ingressos. Lei de Little: workers ocupados = 167 × 0,4 ≈ 67. Entregue todo ingresso em até um minuto."),
    settings: { profile: "load", targetRps: 167, readRatio: 0, seed: 2008, chaos: "off" },
    design: boPdf,
    goals: [G("consumerLag", "<", 60), G("p99", "<", 300), G("errorRate", "<", 0.5)],
    hints: [
      T("Backlog grows at (167 − 50) jobs/s; lag = backlog ÷ drain rate. The buyer does not wait for the PDF (the queue answers in ms): only the lag fails.", "O backlog cresce a (167 − 50) jobs/s; atraso = backlog ÷ taxa de drenagem. O comprador não espera o PDF (a fila responde em ms): só o atraso falha."),
      T("Size for ρ ≈ 0.7: 67 busy ÷ 0.7 ≈ 95 workers. (The compute class does the same with 100 orders/s × 0.8 s = 80 workers busy.)", "Dimensione para ρ ≈ 0,7: 67 ocupados ÷ 0,7 ≈ 95 workers. (A aula de computação faz o mesmo com 100 pedidos/s × 0,8 s = 80 workers ocupados.)")
    ],
    solution: derive(boPdf, { set: [["pdf", { replicas: 95 }]] })
  });

  /* ═══ boxoffice-payment (lab 9) ═══ */
  var boPay = D([N("fans", "client", 80, 220, "fans (pay + browse)"), N("gw", "apigw", 260, 220, "gateway"),
    N("ord", "app", 460, 220, "order", { threads: 50 }), N("db", "sql", 700, 110, "order-db"),
    N("pay", "app", 700, 330, "payment", { latencyMs: 10 }), N("psp", "payment", 930, 330, "psp", { latencyMs: 200 })],
  [E("fans", "gw"), E("gw", "ord"), E("ord", "db"), E("ord", "pay", { filter: "write" }), E("pay", "psp", { timeoutMs: 2000 })]);
  BO({
    id: "boxoffice-payment",
    title: T("BoxOffice lab 9: payment turns slow", "BoxOffice lab 9: o payment fica lento"),
    brief: T("Lab 9: pay-under-chaos.js sends 20 payments/s and 20 browse requests/s to order, which has 50 Tomcat threads. At t = 60 s Toxiproxy adds 3 s to every call to payment (the provider is slow, as at 10:02 in the story). Nothing is down, but 20 payments/s × 3 s = 60 calls in flight > 50 threads: browsing, which never touches the provider, dies too. Protect order the way the lab does.",
      "Lab 9: o pay-under-chaos.js manda 20 pagamentos/s e 20 requisições de navegação/s ao order, que tem 50 threads do Tomcat. Em t = 60 s o Toxiproxy acrescenta 3 s a toda chamada ao payment (o provedor está lento, como às 10:02 na história). Nada caiu, mas 20 pagamentos/s × 3 s = 60 chamadas em andamento > 50 threads: a navegação, que nunca toca o provedor, morre junto. Proteja o order como o lab faz."),
    settings: { profile: "load", targetRps: 40, readRatio: 0.5, seed: 2009, chaos: "off" },
    design: boPay,
    events: [{ t: 60, type: "slow", target: "pay", factor: 300, durationS: 60, label: T("Toxiproxy: +3 s on every call to payment", "Toxiproxy: +3 s em toda chamada ao payment") }],
    goals: [G("p99", "<", 1500), G("errorRate", "<", 25)],
    hints: [
      T("Select the edge order → payment and set the lab's timeout (1 000 ms), 2 retries (3 attempts) with exponential backoff and jitter, and the circuit breaker (it stays open 10 s, as in the lab).", "Selecione a aresta order → payment e defina o timeout do lab (1 000 ms), 2 retries (3 tentativas) com backoff exponencial e jitter, e o circuit breaker (fica aberto 10 s, como no lab)."),
      T("Add the bulkhead: 0.2 of the threads (10 of 50, as in the lab). Payments then fail fast during the incident (half the requests for 60 s, ≈ 20% of the run: the price of failing fast), and browsing keeps its threads: p99 drops from seconds to under 1.5 s.", "Adicione o bulkhead: 0,2 das threads (10 de 50, como no lab). Os pagamentos então falham rápido durante o incidente (metade das requisições por 60 s, ≈ 20% da execução: o preço de falhar rápido) e a navegação mantém suas threads: o p99 cai de segundos para menos de 1,5 s.")
    ],
    solution: derive(boPay, { edgeParams: [["ord-pay", { timeoutMs: 1000, retries: 2, backoff: "exp+jitter", circuitBreaker: true, bulkhead: 0.2 }]] })
  });

  /* ═══ boxoffice-hpa (lab 10) ═══ */
  var boHpa = D([N("fans", "client", 80, 220, "fans"), N("ing", "ingress", 290, 220, "traefik", { replicas: 1 }),
    N("cat", "microservice", 500, 220, "catalog", { replicas: 2, capacity: 500, autoscale: true, minReplicas: 2, maxReplicas: 8, targetUtil: 0.6, warmupS: 40 }),
    N("redis", "cache", 700, 160, "redis", { hitRatio: 0.9 }), N("db", "sql", 700, 300, "db (StatefulSet)", { threads: 30 })],
  [E("fans", "ing"), E("ing", "cat"), E("cat", "redis"), E("redis", "db")],
  [K("kind", 400, 90, 400, 280, "kind", { nodes: 2, podsPerNode: 6 })]);
  BO({
    id: "boxoffice-hpa",
    title: T("BoxOffice lab 10: the HPA arrives late", "BoxOffice lab 10: o HPA chega atrasado"),
    brief: T("Lab 10: the catalog runs on kind (2 workers) with 2 pods and an HPA: min 2, max 8, target 60% CPU; a pod does ≈ 500 req/s and needs ≈ 40 s to become ready. 300 req/s before the sale; at t = 60 s catalog-hpa.js pushes 1 000 req/s. The HPA looks every 15 s, the new pods start 40 s later, and meanwhile 2 pods at 100% drop requests.",
      "Lab 10: o catalog roda no kind (2 workers) com 2 pods e um HPA: mín. 2, máx. 8, alvo de 60% de CPU; um pod faz ≈ 500 req/s e precisa de ≈ 40 s para ficar pronto. 300 req/s antes da venda; em t = 60 s o catalog-hpa.js empurra 1 000 req/s. O HPA olha a cada 15 s, os pods novos sobem 40 s depois e enquanto isso 2 pods a 100% descartam requisições."),
    settings: { profile: "load", targetRps: 300, readRatio: 0.99, seed: 2010, chaos: "off" },
    design: boHpa,
    events: [{ t: 60, type: "viral", factor: 3.33, durationS: 90, label: T("the sale ramp: 1 000 req/s", "a rampa da venda: 1 000 req/s") }],
    goals: [G("errorRate", "<", 0.5), G("p99", "<", 500)],
    hints: [
      T("Reactive autoscaling is late by the decision period plus the startup time (15 s + 40 s here, minutes in the lab). The load arrives at a known time: scale before it.", "O autoscaling reativo atrasa o período de decisão mais o tempo de subida (15 s + 40 s aqui, minutos no lab). A carga chega numa hora conhecida: escale antes dela."),
      T("Raise the HPA minimum to 4 pods (a scheduled pre-scale at 09:45, as the course recommends): 1 000 req/s ÷ (4 × 500) = 50%, below the 60% target. The kind cluster has room: 2 nodes × 6 pods.", "Aumente o mínimo do HPA para 4 pods (um pré-escalonamento agendado às 09:45, como o curso recomenda): 1 000 req/s ÷ (4 × 500) = 50%, abaixo do alvo de 60%. O cluster kind tem espaço: 2 nós × 6 pods.")
    ],
    solution: derive(boHpa, { set: [["cat", { replicas: 4, minReplicas: 4 }]] })
  });

  /* ═══ boxoffice-canary (lab 11) ═══ */
  var boCn = D([N("fans", "client", 80, 220, "fans"), N("ing", "ingress", 290, 220, "ingress"),
    N("catalog", "microservice", 540, 220, "catalog v2", { replicas: 4 }), N("db", "sql", 800, 220, "catalog-db")],
  [E("fans", "ing"), E("ing", "catalog"), E("catalog", "db")],
  [K("prod", 410, 100, 480, 300, "prod", { nodes: 3, podsPerNode: 4 })]);
  BO({
    id: "boxoffice-canary",
    title: T("BoxOffice lab 11: a bad release, all at once or as a canary", "BoxOffice lab 11: uma versão ruim, de uma vez ou como canário"),
    brief: T("Lab 11: release v2 of the catalog has a bug: 30% of its answers fail. Today it replaces all 4 pods at once; Argo CD notices nothing and the analysis rolls it back after about a minute. 600 req/s; v2 goes live at t = 60 s. Ship it so that the same bug costs a fraction of the errors.",
      "Lab 11: a versão v2 do catalog tem um bug: 30% das respostas falham. Hoje ela substitui os 4 pods de uma vez; o Argo CD não percebe nada e a análise a reverte depois de cerca de um minuto. 600 req/s; a v2 entra em t = 60 s. Publique-a de modo que o mesmo bug custe uma fração dos erros."),
    settings: { profile: "load", targetRps: 600, readRatio: 0.95, seed: 2011, chaos: "off" },
    design: boCn,
    events: [{ t: 60, type: "badDeploy", target: "catalog", factor: 0.3, durationS: 60, label: T("v2 goes live (30% errors) until the rollback", "a v2 entra (30% de erros) até o rollback") }],
    goals: [G("errorRate", "<", 5), G("p99", "<", 300)],
    hints: [
      T("Argo Rollouts' first step sends 25% of the traffic to v2 and pauses 2 minutes while the analysis (error ratio < 1%, p99 < 0.5 s, every 30 s) decides. Draw it: the ingress splits by capacity, so 3 pods of v1 (a node \"catalog v1\") and 1 pod of v2 give 25%.", "O primeiro passo do Argo Rollouts manda 25% do tráfego para a v2 e pausa 2 minutos enquanto a análise (taxa de erro < 1%, p99 < 0,5 s, a cada 30 s) decide. Desenhe isso: o ingress divide pela capacidade, então 3 pods da v1 (um nó \"catalog v1\") e 1 pod da v2 dão 25%."),
      T("Errors ≈ share of v2 × 30% × time until the rollback: the canary does not prevent the bug, it shrinks its blast radius.", "Erros ≈ fatia da v2 × 30% × tempo até o rollback: o canário não impede o bug, ele reduz o raio de impacto.")
    ],
    solution: derive(boCn, {
      set: [["catalog", { replicas: 1 }]], move: [["catalog", 540, 300]],
      nodes: [N("stable", "microservice", 540, 150, "catalog v1", { replicas: 3 })], edges: [E("ing", "stable"), E("stable", "db")]
    })
  });

  /* ═══ boxoffice-observability (lab 8) ═══ */
  var boObs = D([N("fans", "client", 80, 200, "k6 (catalog-otel.js)"), N("edge", "lb", 260, 200, "edge (nginx)"), N("gw", "apigw", 440, 200, "gateway"),
    N("cat", "app", 630, 200, "catalog", { replicas: 3 }), N("redis", "cache", 820, 120, "redis", { hitRatio: 0.8 }), N("db", "sql", 1020, 200, "catalog-db", { threads: 30 })],
  [E("fans", "edge"), E("edge", "gw"), E("gw", "cat"), E("cat", "redis"), E("redis", "db", { timeoutMs: 1000 })]);
  BO({
    id: "boxoffice-observability",
    title: T("BoxOffice lab 8: the database stops, does anybody know?", "BoxOffice lab 8: o banco para, alguém sabe?"),
    brief: T("Lab 8: 200 req/s on the catalog (SLO 99.5% over 28 days). At t = 60 s the database is stopped; Redis still answers the hits, every miss fails. Nobody sees it: no service sends metrics (utilization shows \"?\"), there are no traces and no alert, so the repair takes 100 s. Wire the observability stack the lab installs (OpenTelemetry → LGTM) and let an alert shorten the repair.",
      "Lab 8: 200 req/s no catalog (SLO de 99,5% em 28 dias). Em t = 60 s o banco é parado; o Redis ainda responde os acertos, todo miss falha. Ninguém vê: nenhum serviço manda métricas (a utilização aparece como \"?\"), não há traces nem alerta, então o reparo leva 100 s. Monte a pilha de observabilidade que o lab instala (OpenTelemetry → LGTM) e deixe um alerta encurtar o reparo."),
    settings: { profile: "load", targetRps: 200, readRatio: 0.99, seed: 2012, chaos: "off" },
    godMode: false,
    design: boObs,
    events: [{ t: 60, type: "crash", target: "db", durationS: 100, label: T("docker compose stop db", "docker compose stop db") }],
    goals: [G("observed", ">=", 100), G("tracing", ">=", 1), G("availability", ">=", 90)],
    hints: [
      T("The OpenTelemetry agent runs in every service: connect Metrics to the edge, the gateway, the catalog, Redis and the database, and add Tracing and Logs to the catalog.", "O agente OpenTelemetry roda em todo serviço: conecte o Metrics à borda, ao gateway, ao catalog, ao Redis e ao banco, e adicione Tracing e Logs ao catalog."),
      T("Connect Alerting to Metrics (the lab's burn-rate rules, 14.4× and 6×): people start repairing sooner and the outage is halved. Availability ≈ 1 − miss share × outage ÷ run.", "Conecte o Alerting ao Metrics (as regras de burn rate do lab, 14,4× e 6×): as pessoas começam a reparar antes e a queda cai pela metade. Disponibilidade ≈ 1 − fração de misses × queda ÷ execução.")
    ],
    solution: derive(boObs, {
      nodes: [N("m", "metrics", 630, 360, "metrics (Prometheus)"), N("tr", "tracing", 630, 60, "traces (Tempo)"), N("lg", "logs", 820, 300, "logs (Loki)"), N("al", "alerting", 440, 360, "alerts (Grafana)")],
      edges: [E("edge", "m"), E("gw", "m"), E("cat", "m"), E("redis", "m"), E("db", "m"), E("cat", "tr"), E("cat", "lg"), E("al", "m")]
    })
  });

  /* ═══ boxoffice-assistant (lab 12) ═══ */
  var boAi = D([N("fans", "client", 80, 220, "fans"), N("gw", "apigw", 260, 220, "gateway"), N("asst", "orchestrator", 460, 220, "assistant", { steps: 4 }),
    N("llm", "llmgw", 700, 90, "LiteLLM → local model", { quota: 1, latencyMs: 3000, tokensPerReq: 900, pricePer1k: 0.003 }),
    N("tools", "toolreg", 700, 220, "tools"), N("cat", "app", 920, 170, "catalog"), N("inv", "app", 920, 270, "inventory"),
    N("mem", "memory", 700, 360, "retrieval (k = 5)"), N("vec", "vectordb", 920, 380, "pgvector")],
  [E("fans", "gw"), E("gw", "asst"), E("asst", "llm"), E("asst", "tools"), E("tools", "cat"), E("tools", "inv"), E("asst", "mem"), E("mem", "vec")]);
  BO({
    id: "boxoffice-assistant",
    title: T("BoxOffice lab 12: the seat assistant", "BoxOffice lab 12: o assistente de assentos"),
    brief: T("Lab 12: fans ask \"two seats under R$ 300 on Saturday?\". The assistant runs up to MAX_STEPS = 4 model calls per question, reads the catalog and the seat map through tools and retrieves 5 passages from pgvector. The local model answers one call in ≈ 3 s and takes ≈ 1 call/s; at 0.5 questions/s the agent loop already needs 2 calls/s, and nothing screens what fans type.",
      "Lab 12: fãs perguntam \"dois assentos abaixo de R$ 300 no sábado?\". O assistente faz até MAX_STEPS = 4 chamadas ao modelo por pergunta, lê o catálogo e o mapa de assentos por ferramentas e recupera 5 trechos do pgvector. O modelo local responde uma chamada em ≈ 3 s e aceita ≈ 1 chamada/s; com 0,5 pergunta/s o laço do agente já precisa de 2 chamadas/s e nada filtra o que os fãs digitam."),
    settings: { profile: "load", targetRps: 0.5, readRatio: 1, seed: 2013, chaos: "off" },
    design: boAi,
    goals: [G("errorRate", "<", 1), G("p99", "<", 25000), G("unsafeRate", "<", 0.1)],
    hints: [
      T("Calls to the model = questions × steps. Fewer steps (retrieve first, then answer: 2 calls) and a semantic cache for repeated questions lower the load; LiteLLM's fallback sends the overflow to the second model instead of failing.", "Chamadas ao modelo = perguntas × passos. Menos passos (recuperar primeiro e depois responder: 2 chamadas) e um cache semântico para perguntas repetidas reduzem a carga; o fallback do LiteLLM manda o excesso para o segundo modelo em vez de falhar."),
      T("Put a Safety Mesh between the gateway and the assistant: the lab caps the input (MAX_INPUT_CHARS = 2 000) and allows only read-only tools; the mesh is where those checks run on every prompt.", "Coloque um Safety Mesh entre o gateway e o assistente: o lab limita a entrada (MAX_INPUT_CHARS = 2 000) e só permite ferramentas de leitura; o mesh é onde essas verificações rodam em todo prompt.")
    ],
    solution: derive(boAi, {
      dropEdges: ["gw-asst"], set: [["asst", { steps: 2 }], ["llm", { semanticCacheHit: 0.2, fallbackModel: true }]],
      move: [["asst", 590, 220], ["llm", 800, 90], ["tools", 800, 220], ["cat", 1010, 170], ["inv", 1010, 270], ["mem", 800, 360], ["vec", 1010, 380]],
      nodes: [N("safe", "safety", 420, 220, "guardrails")], edges: [E("gw", "safe"), E("safe", "asst")]
    })
  });

  /* ═══ boxoffice-shared-llm (lab 13, class 14) ═══ */
  var boSh = D([N("fans", "client", 80, 140, "fans"), N("ci", "scheduler", 80, 320, "PR reviews + fix agents", { jobs: 100, everyS: 120, spreadS: 10 }),
    N("asst", "orchestrator", 320, 140, "assistant", { steps: 3 }), N("rev", "orchestrator", 320, 320, "CI agents", { steps: 6 }),
    N("llm", "llmgw", 580, 230, "LLM gateway", { quota: 10 })],
  [E("fans", "asst"), E("ci", "rev"), E("asst", "llm"), E("rev", "llm")]);
  BO({
    id: "boxoffice-shared-llm",
    title: T("BoxOffice lab 13: build agents share the fans' LLM quota", "BoxOffice lab 13: os agentes de build dividem a cota de LLM dos fãs"),
    brief: T("Lab 13 and class 14: the same LLM gateway (10 calls/s) serves the fans' assistant (1 question/s × 3 steps) and the continuous integration (CI) agents: a batch of 100 pull-request reviews and fix agents (6 turns each) starts every 2 minutes within 10 s: 600 model calls in 10 s. When the batch lands, fans get 429s. Keep the fans' errors under 1% without buying a bigger quota.",
      "Lab 13 e aula 14: o mesmo LLM gateway (10 chamadas/s) atende o assistente dos fãs (1 pergunta/s × 3 passos) e os agentes de integração contínua (CI, continuous integration): um lote de 100 revisões de pull request e agentes de correção (6 turnos cada) começa a cada 2 minutos em 10 s: 600 chamadas ao modelo em 10 s. Quando o lote chega, os fãs recebem 429. Mantenha os erros dos fãs abaixo de 1% sem comprar uma cota maior."),
    settings: { profile: "load", targetRps: 1, readRatio: 1, seed: 2014, chaos: "off" },
    design: boSh,
    goals: [G("errorRate", "<", 1), G("consumerLag", "<", 300)],
    hints: [
      T("CI does not need an answer in seconds: put a Message Queue in front of the CI agents (scheduler → queue → CI agents) and give the agents a fixed concurrency, so they drain the batch at the pace the quota leaves free.", "A CI não precisa de resposta em segundos: coloque uma Message Queue antes dos agentes de CI (scheduler → fila → agentes de CI) e dê aos agentes uma concorrência fixa, para que drenem o lote no ritmo que a cota deixa livre."),
      T("The lab caps each fix agent (25 turns, US$ 1.50): fewer turns per job is the other lever. A separate key and quota per workload is the gateway's version of a bulkhead.", "O lab limita cada agente de correção (25 turnos, US$ 1,50): menos turnos por job é a outra alavanca. Uma chave e uma cota separadas por carga de trabalho são a versão de bulkhead do gateway.")
    ],
    solution: derive(boSh, {
      dropEdges: ["ci-rev"], set: [["rev", { replicas: 1, threads: 6 }]], move: [["rev", 420, 320]],
      nodes: [N("q", "queue", 240, 320, "ci-jobs")], edges: [E("ci", "q"), E("q", "rev")]
    })
  });

  /* ═══ ticketing (case study) ═══ */
  var tk = D([N("fans", "client", 80, 220, "fans"), N("lb", "lb", 270, 220), N("sale", "app", 470, 220, "sale", { replicas: 40 }),
    N("db", "sql", 720, 140, "inventory-db"), N("psp", "payment", 720, 320, "psp", { latencyMs: 2000 })],
  [E("fans", "lb"), E("lb", "sale"), E("sale", "db"), E("sale", "psp", { filter: "write" })]);
  CASE({
    id: "ticketing",
    title: T("Ticketing: 2 M fans, 60 k seats", "Venda de ingressos: 2 M de fãs, 60 mil assentos"),
    brief: T("The case study: 2 million fans arrive in 120 s for 60 000 seats. Each fan joins (≈ 17 000 joins/s) and then polls its position every 10 s (≈ 200 000 polls/s); the payment provider takes 2 s. With no line, ≈ 200 000 req/s hit 40 sale servers and one inventory database. Keep the hold p99 under 300 ms.",
      "O estudo de caso: 2 milhões de fãs chegam em 120 s para 60 000 assentos. Cada fã entra na fila (≈ 17 000 entradas/s) e depois consulta sua posição a cada 10 s (≈ 200 000 consultas/s); o provedor de pagamento leva 2 s. Sem fila, ≈ 200 000 req/s atingem 40 servidores de venda e um banco de inventário. Mantenha o p99 da reserva abaixo de 300 ms."),
    settings: { profile: "load", targetRps: 217000, readRatio: 0.92, seed: 2015, chaos: "off" },
    design: tk,
    goals: [G("errorRate", "<", 1), G("p99", "<", 300)],
    hints: [
      T("Polls are the same answer for everybody in a second: a CDN with a 1 s micro-cache (hit ≈ 98%) in front of a small status service takes them.", "As consultas de posição são a mesma resposta para todos durante um segundo: uma CDN com micro-cache de 1 s (acerto ≈ 98%) na frente de um pequeno serviço de status as absorve."),
      T("Joins go to a waiting room (gateway → Message Queue, filter = write); shoppers are admitted at ≈ 33 fans/s (10 000 active × 300 s each). Each admitted shopper holds seats and pays: ≈ 33/s × 2 s ≈ 70 calls in flight to the provider.", "As entradas vão para uma sala de espera (gateway → Message Queue, filtro = write); compradores são admitidos a ≈ 33 fãs/s (10 000 ativos × 300 s cada). Cada comprador admitido reserva assentos e paga: ≈ 33/s × 2 s ≈ 70 chamadas em andamento no provedor.")
    ],
    solution: D([
      N("fans", "client", 80, 220, "fans"), N("cdn", "cdn", 260, 220, "", { hitRatio: 0.98, respKB: 1 }), N("gw", "apigw", 440, 220, "gateway", { replicas: 3 }),
      N("st", "app", 650, 110, "position status", { replicas: 12 }), N("cache", "cache", 860, 110, "queue state"),
      N("wr", "queue", 650, 330, "waiting room"), N("shop", "worker", 860, 330, "shoppers", { replicas: 4, capacity: 8.3, latencyMs: 5, threads: 40 }),
      N("db", "sql", 1080, 220, "inventory-db"), N("psp", "payment", 1080, 400, "psp", { latencyMs: 2000 })
    ], [
      E("fans", "cdn"), E("cdn", "gw"), E("gw", "st", { filter: "read" }), E("st", "cache"),
      E("gw", "wr", { filter: "write" }), E("wr", "shop"), E("shop", "db"), E("shop", "psp")
    ])
  });

  /* ═══ distributed-cache (case study) ═══ */
  var dc = D([N("apps", "client", 80, 200, "app servers", { zipfS: 0 }), N("cache", "cache", 340, 200, "cache cluster", { replicas: 17, capacity: 80000, hitRatio: 0.95, cacheWarmS: 600 }),
    N("db", "nosql", 620, 200, "database", { replicas: 32 })],
  [E("apps", "cache"), E("cache", "db")]);
  CASE({
    id: "distributed-cache",
    title: T("Distributed cache: memory or throughput?", "Cache distribuído: memória ou vazão?"),
    brief: T("The case study: 1 billion items of 1 KB, 2 million reads/s, 95% hits. 1.1 TB fits in 17 nodes of 64 GB — but one node serves 80 000 ops/s, so 17 nodes give 1.36 M ops/s. Behind the cache, the database takes the misses: 100 000 req/s at 95%, twice that at 90%. Serve 2 M reads/s with p99 under 10 ms.",
      "O estudo de caso: 1 bilhão de itens de 1 KB, 2 milhões de leituras/s, 95% de acertos. 1,1 TB cabe em 17 nós de 64 GB — mas um nó atende 80 000 ops/s, então 17 nós dão 1,36 M ops/s. Atrás do cache, o banco recebe os misses: 100 000 req/s a 95%, o dobro a 90%. Atenda 2 M leituras/s com p99 abaixo de 10 ms."),
    settings: { profile: "load", targetRps: 2000000, readRatio: 1, seed: 2016, chaos: "off" },
    design: dc,
    goals: [G("errorRate", "<", 0.5), G("p99", "<", 10)],
    hints: [
      T("Size by the larger of the two: memory (1.1 TB ÷ 64 GB ≈ 17 nodes) and throughput (2 M ÷ 80 k = 25 nodes at 100%). Keep headroom and a copy of every shard: the case ends with 50 nodes (25 shards × 2).", "Dimensione pelo maior dos dois: memória (1,1 TB ÷ 64 GB ≈ 17 nós) e vazão (2 M ÷ 80 mil = 25 nós a 100%). Mantenha folga e uma cópia de cada shard: o caso termina com 50 nós (25 shards × 2)."),
      T("Try a hit ratio of 0.90: the database load doubles to 200 000 req/s. The hit ratio sizes the database as much as the cache.", "Experimente uma taxa de acerto de 0,90: a carga no banco dobra para 200 000 req/s. A taxa de acerto dimensiona o banco tanto quanto o cache.")
    ],
    solution: derive(dc, { set: [["cache", { replicas: 50 }]] })
  });

  /* ════════════════════════════════════════════════════════════════════
     More classic interview problems (case studies). Each one isolates the
     single idea the problem is known for, with numbers small enough to
     derive on paper.
     ════════════════════════════════════════════════════════════════════ */

  /* ═══ file-sync (Dropbox) ═══ */
  var fsy = D([N("client", "client", 80, 220, "desktop clients"), N("lb", "lb", 270, 220),
    N("api", "app", 470, 220, "sync API", { replicas: 4, latencyMs: 400, sigma: 0.5, threads: 50 }),
    N("db", "sql", 720, 120, "file metadata"), N("obj", "objstore", 720, 320, "blocks")],
  [E("client", "lb"), E("lb", "api"), E("api", "db"), E("api", "obj", { filter: "write" })]);
  CASE({
    id: "file-sync",
    title: T("File sync: keep the bytes off your servers", "Sincronização de arquivos: tire os bytes dos seus servidores"),
    brief: T("Desktop clients sync folders: 1 000 req/s, 80% ask \"what changed?\" (a metadata read), 20% upload a 4 MB block. Today every block streams through the sync API on its way to object storage: each upload holds an API thread for ≈ 400 ms, and the metadata checks wait behind them. Let clients send the bytes straight to storage.",
      "Clientes desktop sincronizam pastas: 1 000 req/s, 80% perguntam \"o que mudou?\" (uma leitura de metadados), 20% enviam um bloco de 4 MB. Hoje cada bloco passa pela API de sincronização a caminho do object storage: cada upload prende uma thread da API por ≈ 400 ms, e as consultas de metadados esperam atrás deles. Deixe os clientes mandarem os bytes direto para o storage."),
    settings: { profile: "load", targetRps: 1000, readRatio: 0.8, seed: 101, chaos: "off" },
    design: fsy,
    goals: [G("p99", "<", 150), G("errorRate", "<", 0.5)],
    hints: [
      T("Little's Law on the API: 200 uploads/s × 0.4 s = 80 threads busy just moving bytes. Pre-signed URLs let the client PUT the block to the Object Store itself (client → objstore, filter write).", "Lei de Little na API: 200 uploads/s × 0,4 s = 80 threads ocupadas só movendo bytes. URLs pré-assinadas deixam o cliente fazer o PUT do bloco no Object Store (client → objstore, filtro write)."),
      T("Without the bytes, the API only signs URLs and commits metadata: a few ms per request, so its latency drops (set it to ≈ 10 ms) and two replicas are enough.", "Sem os bytes, a API só assina URLs e grava metadados: poucos ms por requisição, então sua latência cai (ajuste para ≈ 10 ms) e duas réplicas bastam.")
    ],
    solution: D([N("client", "client", 80, 220, "desktop clients"), N("lb", "lb", 270, 220),
      N("api", "app", 470, 220, "sync API", { replicas: 3, latencyMs: 10, threads: 200 }),
      N("db", "sql", 720, 120, "file metadata"), N("obj", "objstore", 470, 400, "blocks")],
    [E("client", "lb"), E("lb", "api"), E("api", "db"), E("client", "obj", { filter: "write" })])
  });

  /* ═══ proximity-search (Yelp) ═══ */
  var px = D([N("client", "mobile", 80, 200, "users"), N("lb", "lb", 270, 200), N("app", "app", 470, 200, "places API", { replicas: 12 }),
    N("db", "sql", 720, 200, "businesses (lat/lon scan)", { capacity: 1200, latencyMs: 60, readReplicas: 2 })],
  [E("client", "lb"), E("lb", "app"), E("app", "db")]);
  CASE({
    id: "proximity-search",
    title: T("Proximity search: businesses near me", "Busca por proximidade: estabelecimentos perto de mim"),
    brief: T("\"Restaurants within 2 km\": 5 000 req/s, 99% reads, a few new reviews and businesses. The query scans a latitude/longitude range in PostgreSQL (60 ms, even with two read replicas). Most searches come from the same busy neighbourhoods. Give the read path a geospatial index and cache the popular cells.",
      "\"Restaurantes num raio de 2 km\": 5 000 req/s, 99% leituras, poucas avaliações e estabelecimentos novos. A consulta varre uma faixa de latitude/longitude no PostgreSQL (60 ms, mesmo com duas réplicas de leitura). A maioria das buscas vem dos mesmos bairros movimentados. Dê ao caminho de leitura um índice geoespacial e faça cache das células populares."),
    settings: { profile: "load", targetRps: 5000, readRatio: 0.99, seed: 103, chaos: "off" },
    design: px,
    goals: [G("p99", "<", 120), G("errorRate", "<", 0.5), G("costPerMonth", "<", 6000)],
    hints: [
      T("A geohash (or quadtree) turns \"near me\" into a lookup of a few cells: reads go app → Cache → Search (filter read). Writes (new reviews) still go to SQL, the source of truth.", "Um geohash (ou quadtree) transforma \"perto de mim\" na busca de algumas células: leituras vão app → Cache → Search (filtro read). Escritas (avaliações novas) continuam no SQL, a fonte da verdade."),
      T("Searches cluster in a few cells: a cache keyed by (cell, category) hits ≈ 80%, so Search only sees ≈ 1 000 req/s.", "As buscas se concentram em poucas células: um cache com chave (célula, categoria) acerta ≈ 80%, e o Search só vê ≈ 1 000 req/s.")
    ],
    solution: derive(px, {
      dropEdges: ["app-db"], set: [["db", { readReplicas: 0 }]], move: [["db", 720, 340]],
      nodes: [N("cache", "cache", 720, 120, "cell cache", { hitRatio: 0.8 }), N("geo", "search", 960, 120, "geo index", { replicas: 3 })],
      edges: [E("app", "cache", { filter: "read" }), E("cache", "geo"), E("app", "db", { filter: "write" })]
    })
  });

  /* ═══ code-judge (LeetCode) ═══ */
  var cj = D([N("client", "client", 80, 220, "coders"), N("lb", "lb", 270, 220), N("app", "app", 470, 220, "contest API", { replicas: 4 }),
    N("db", "sql", 720, 120, "problems + results"), N("judge", "worker", 720, 340, "sandbox runner", { replicas: 60, capacity: 0.5, latencyMs: 2000, sigma: 0.3, threads: 1, queueLimit: 4 })],
  [E("client", "lb"), E("lb", "app"), E("app", "db"), E("app", "judge", { filter: "write" })]);
  CASE({
    id: "code-judge",
    title: T("Online judge: the contest starts", "Juiz online: o contest começa"),
    brief: T("Coders read problems and submit solutions: 400 req/s, 90% reads. Each submission runs in a sandbox for ≈ 2 s, and the API waits for the verdict. At t = 60 s a contest starts and traffic triples for two minutes. API threads pile up behind the sandboxes and even problem pages stop loading. Accept submissions at once and judge them from a queue.",
      "Programadores leem problemas e enviam soluções: 400 req/s, 90% leituras. Cada submissão roda num sandbox por ≈ 2 s, e a API espera o veredito. Em t = 60 s começa um contest e o tráfego triplica por dois minutos. As threads da API se acumulam atrás dos sandboxes e até as páginas dos problemas param de carregar. Aceite as submissões na hora e julgue-as a partir de uma fila."),
    settings: { profile: "load", targetRps: 400, readRatio: 0.9, seed: 107, chaos: "off" },
    design: cj,
    events: [{ t: 60, type: "viral", factor: 3, durationS: 120, label: T("the contest starts", "o contest começa") }],
    goals: [G("errorRate", "<", 1), G("p99", "<", 200), G("consumerLag", "<", 90)],
    hints: [
      T("Put a Message Queue between the API and the runners (app → queue → runner, filter write). The API answers \"pending\" and the client polls the result.", "Coloque uma Message Queue entre a API e os runners (app → queue → runner, filtro write). A API responde \"pendente\" e o cliente consulta o resultado."),
      T("Runner throughput = replicas × 1 / 2 s. In the contest 120 submissions/s arrive: with 160 runners (80/s) the queue grows by 40/s for two minutes and the last verdict waits about a minute.", "Vazão dos runners = réplicas × 1 / 2 s. No contest chegam 120 submissões/s: com 160 runners (80/s) a fila cresce 40/s por dois minutos e o último veredito espera cerca de um minuto.")
    ],
    solution: derive(cj, {
      dropEdges: ["app-judge"], set: [["judge", { replicas: 160 }]], move: [["judge", 940, 340]],
      nodes: [N("q", "queue", 720, 340, "submissions")], edges: [E("app", "q", { filter: "write" }), E("q", "judge"), E("judge", "db")]
    })
  });

  /* ═══ online-auction ═══ */
  var oa = D([N("client", "client", 80, 220, "bidders + watchers"), N("lb", "lb", 270, 220), N("app", "app", 470, 220, "auction API", { replicas: 16 }),
    N("db", "sql", 720, 220, "auctions + bids")],
  [E("client", "lb"), E("lb", "app"), E("app", "db")]);
  CASE({
    id: "online-auction",
    title: T("Online auction: the last minute", "Leilão online: o último minuto"),
    brief: T("Watchers refresh the current price and bidders place bids: 2 000 req/s, 90% reads, all on PostgreSQL. At t = 60 s the hottest auctions enter their final minute and traffic triples (sniping). Every bid must be ordered per auction and none may be lost, but the watchers don't need to hit the database to see the price.",
      "Observadores atualizam o preço atual e licitantes dão lances: 2 000 req/s, 90% leituras, tudo no PostgreSQL. Em t = 60 s os leilões mais disputados entram no último minuto e o tráfego triplica (sniping). Todo lance precisa ser ordenado por leilão e nenhum pode se perder, mas os observadores não precisam ir ao banco para ver o preço."),
    settings: { profile: "load", targetRps: 2000, readRatio: 0.9, seed: 109, chaos: "off" },
    design: oa,
    events: [{ t: 60, type: "viral", factor: 3, durationS: 60, label: T("final minute: sniping", "último minuto: sniping") }],
    goals: [G("p99", "<", 150), G("errorRate", "<", 0.5), G("consumerLag", "<", 15)],
    hints: [
      T("Reads: app → Cache (filter read) → db. The current price changes only when a bid wins, so even a 1 s TTL absorbs almost every refresh.", "Leituras: app → Cache (filtro read) → db. O preço atual só muda quando um lance vence, então até um TTL de 1 s absorve quase todas as atualizações."),
      T("Bids: app → Kafka (filter write), partitioned by auction id, so each auction's bids stay in order; bid workers apply them to the database. Kafka acknowledges the bid durably in milliseconds.", "Lances: app → Kafka (filtro write), particionado pelo id do leilão, para que os lances de cada leilão fiquem em ordem; workers aplicam-nos no banco. O Kafka confirma o lance de forma durável em milissegundos.")
    ],
    solution: derive(oa, {
      dropEdges: ["app-db"], move: [["db", 1000, 220]],
      nodes: [N("cache", "cache", 720, 110, "price cache", { hitRatio: 0.95 }), N("k", "kafka", 720, 330, "bids (by auction)"), N("bw", "worker", 880, 330, "bid processor", { replicas: 6 })],
      edges: [E("app", "cache", { filter: "read" }), E("cache", "db"), E("app", "k", { filter: "write" }), E("k", "bw"), E("bw", "db")]
    })
  });

  /* ═══ ad-click-aggregator ═══ */
  var ac = D([N("client", "client", 80, 220, "ad clicks"), N("lb", "lb", 270, 220), N("app", "app", 470, 220, "click redirect", { replicas: 40 }),
    N("db", "sql", 720, 220, "clicks (one row each)")],
  [E("client", "lb"), E("lb", "app"), E("app", "db")]);
  CASE({
    id: "ad-click-aggregator",
    title: T("Ad click aggregator: count, don't store", "Agregador de cliques: conte, não armazene"),
    brief: T("Every ad click redirects the user and must be counted for billing: 10 000 clicks/s, plus a few advertisers reading their dashboards (2%). Today each click is an INSERT into PostgreSQL before the redirect, and the dashboards run COUNT(*) on the same table. Make the redirect fast and aggregate the clicks in a stream.",
      "Cada clique num anúncio redireciona o usuário e precisa ser contado para cobrança: 10 000 cliques/s, mais alguns anunciantes lendo seus painéis (2%). Hoje cada clique é um INSERT no PostgreSQL antes do redirecionamento, e os painéis rodam COUNT(*) na mesma tabela. Deixe o redirecionamento rápido e agregue os cliques num stream."),
    settings: { profile: "load", targetRps: 10000, readRatio: 0.02, seed: 113, chaos: "off" },
    design: ac,
    goals: [G("p99", "<", 50), G("errorRate", "<", 0.1), G("consumerLag", "<", 10)],
    hints: [
      T("Clicks: app → Kafka (filter write); the redirect answers as soon as the event is in the log. Stream aggregators (Analytics) consume it and keep per-minute counts per ad.", "Cliques: app → Kafka (filtro write); o redirecionamento responde assim que o evento está no log. Agregadores de stream (Analytics) o consomem e mantêm contagens por minuto e por anúncio."),
      T("Aggregation is a batching ratio: one write per ad per minute instead of one per click. Set the edge ratio from the aggregators to the counts store to 0.01. Dashboards read the counts, never the raw clicks.", "Agregar é uma razão de lote: uma escrita por anúncio por minuto em vez de uma por clique. Ajuste a razão da aresta dos agregadores ao banco de contagens para 0,01. Os painéis leem as contagens, nunca os cliques brutos.")
    ],
    solution: D([N("client", "client", 80, 220, "ad clicks"), N("lb", "lb", 270, 220), N("app", "app", 470, 220, "click redirect", { replicas: 30 }),
      N("k", "kafka", 700, 320, "click events", { partitions: 12 }), N("agg", "analytics", 900, 320, "stream aggregators", { replicas: 8 }),
      N("counts", "nosql", 1120, 220, "counts per ad-minute"), N("raw", "objstore", 1120, 420, "raw clicks (audit)")],
    [E("client", "lb"), E("lb", "app"), E("app", "k", { filter: "write" }), E("app", "counts", { filter: "read" }), E("k", "agg"),
      E("agg", "counts", { ratio: 0.01 }), E("agg", "raw", { ratio: 0.001 })])
  });

  /* ═══ web-crawler ═══ */
  var wc = D([N("seeds", "scheduler", 80, 220, "URL frontier feed", { jobs: 800, everyS: 1, spreadS: 1 }), N("q", "queue", 270, 220, "frontier"),
    N("fetch", "worker", 470, 220, "fetchers", { replicas: 4, capacity: 1000, latencyMs: 5, threads: 50 }),
    N("web", "thirdparty", 720, 120, "the web", { latencyMs: 150, quota: 100000 }), N("obj", "objstore", 720, 320, "pages")],
  [E("seeds", "q"), E("q", "fetch"), E("fetch", "web"), E("fetch", "obj")]);
  CASE({
    id: "web-crawler",
    title: T("Web crawler: slow sites hold the fetchers", "Crawler: sites lentos prendem os fetchers"),
    brief: T("The crawler fetches 800 pages/s from a frontier queue and stores them. A fetch takes ≈ 150 ms, so fetchers are bound by threads, not CPU. At t = 60 s a slice of the web turns slow (4×): with no timeout, every thread waits on the slow sites and the frontier backs up. Keep the crawl moving.",
      "O crawler busca 800 páginas/s de uma fila de fronteira e as armazena. Uma busca leva ≈ 150 ms, então os fetchers são limitados por threads, não por CPU. Em t = 60 s uma parte da web fica lenta (4×): sem timeout, toda thread espera os sites lentos e a fronteira acumula. Mantenha o crawl andando."),
    settings: { profile: "load", targetRps: 800, readRatio: 1, seed: 127, chaos: "off" },
    design: wc,
    events: [{ t: 60, type: "slow", target: "web", factor: 4, durationS: 90, label: T("a slice of the web turns slow", "uma parte da web fica lenta") }],
    goals: [G("consumerLag", "<", 20), G("errorRate", "<", 3)],
    hints: [
      T("Throughput of a fetcher = threads ÷ time per fetch. 4 × 50 threads ÷ 0.15 s ≈ 1 330 pages/s normally, ≈ 330 when sites are 4× slower.", "Vazão de um fetcher = threads ÷ tempo por busca. 4 × 50 threads ÷ 0,15 s ≈ 1 330 páginas/s normalmente, ≈ 330 quando os sites ficam 4× mais lentos."),
      T("Fetching is I/O: use async I/O (many more threads per fetcher) and put a timeout on the edge to the web, so a slow site costs at most the timeout. Skip and re-queue it later, politely.", "Buscar é I/O: use I/O assíncrono (muito mais threads por fetcher) e ponha um timeout na aresta para a web, para que um site lento custe no máximo o timeout. Pule e re-enfileire depois, com educação.")
    ],
    solution: derive(wc, { set: [["fetch", { threads: 400 }]], edgeParams: [["fetch-web", { timeoutMs: 2000 }]] })
  });

  /* ═══ post-search ═══ */
  var psr = D([N("client", "client", 80, 220, "users"), N("lb", "lb", 270, 220), N("app", "app", 470, 220, "posts API", { replicas: 10 }),
    N("db", "nosql", 720, 120, "posts"), N("se", "search", 720, 320, "search index", { replicas: 4 })],
  [E("client", "lb"), E("lb", "app"), E("app", "db", { filter: "write" }), E("app", "se")]);
  CASE({
    id: "post-search",
    title: T("Post search: index asynchronously", "Busca de posts: indexe de forma assíncrona"),
    brief: T("Users search posts by keyword: 4 000 req/s, 60% searches, 40% new posts. Today each new post is written to the posts store and indexed synchronously in the same request; indexing costs as much as a search, so the index cluster carries both loads. Searches may lag new posts by a few seconds.",
      "Usuários buscam posts por palavra-chave: 4 000 req/s, 60% buscas, 40% posts novos. Hoje cada post novo é gravado no banco de posts e indexado de forma síncrona na mesma requisição; indexar custa tanto quanto buscar, então o cluster de índice carrega as duas cargas. As buscas podem ficar alguns segundos atrás dos posts novos."),
    settings: { profile: "load", targetRps: 4000, readRatio: 0.6, seed: 131, chaos: "off" },
    design: psr,
    goals: [G("p99", "<", 150), G("errorRate", "<", 0.5), G("consumerLag", "<", 5)],
    hints: [
      T("Writes: app → posts store and app → Kafka (filter write); indexer workers consume the log and update the index in bulk (edge ratio ≈ 0.1: one bulk request per ten posts).", "Escritas: app → banco de posts e app → Kafka (filtro write); workers indexadores consomem o log e atualizam o índice em lote (razão da aresta ≈ 0,1: uma requisição em lote a cada dez posts)."),
      T("Reads: app → Cache (filter read) → index. Popular queries repeat; even a short TTL takes half of them off the index.", "Leituras: app → Cache (filtro read) → índice. Consultas populares se repetem; mesmo um TTL curto tira metade delas do índice.")
    ],
    solution: D([N("client", "client", 80, 220, "users"), N("lb", "lb", 270, 220), N("app", "app", 470, 220, "posts API", { replicas: 10 }),
      N("db", "nosql", 720, 60, "posts"), N("cache", "cache", 720, 190, "query cache", { hitRatio: 0.5 }), N("k", "kafka", 720, 340, "post events"),
      N("ix", "worker", 930, 340, "indexers", { replicas: 4, capacity: 500, latencyMs: 20, threads: 50 }), N("se", "search", 960, 190, "search index", { replicas: 4 })],
    [E("client", "lb"), E("lb", "app"), E("app", "db", { filter: "write" }), E("app", "k", { filter: "write" }), E("app", "cache", { filter: "read" }),
      E("cache", "se"), E("k", "ix"), E("ix", "se", { ratio: 0.1 })])
  });

  /* ═══ live-comments ═══ */
  var lc = D([N("viewers", "client", 80, 220, "viewers"), N("lb", "lb", 270, 220), N("app", "app", 470, 220, "comments API", { replicas: 40 }),
    N("db", "sql", 720, 220, "comments", { readReplicas: 3 })],
  [E("viewers", "lb"), E("lb", "app"), E("app", "db")]);
  CASE({
    id: "live-comments",
    title: T("Live comments: a million viewers polling", "Comentários ao vivo: um milhão de espectadores consultando"),
    brief: T("A live video has 100 000 viewers; each asks \"any new comments?\" every 5 s (20 000 req/s) and 1% of the requests post a comment. Every poll runs \"comments since t\" on the database. The answer is the same for every viewer of the stream within a second. Take the polls off the database and push new comments out.",
      "Um vídeo ao vivo tem 100 000 espectadores; cada um pergunta \"algum comentário novo?\" a cada 5 s (20 000 req/s) e 1% das requisições publica um comentário. Toda consulta roda \"comentários desde t\" no banco. A resposta é a mesma para todos os espectadores do stream durante um segundo. Tire as consultas do banco e empurre os comentários novos."),
    settings: { profile: "load", targetRps: 20000, readRatio: 0.99, seed: 137, chaos: "off" },
    design: lc,
    goals: [G("p99", "<", 100), G("errorRate", "<", 0.5)],
    hints: [
      T("Polls: a CDN with a 1 s micro-cache (filter read) answers almost every poll at the edge: the origin sees about one request per second per stream and edge node.", "Consultas: uma CDN com micro-cache de 1 s (filtro read) responde quase todas na borda: a origem vê cerca de uma requisição por segundo por stream e nó de borda."),
      T("Comments: publish them (app → Pub/Sub, filter write); real-time servers subscribed to the stream push them over SSE/WebSockets. The database only stores them.", "Comentários: publique-os (app → Pub/Sub, filtro write); servidores de tempo real assinantes do stream os empurram por SSE/WebSockets. O banco só os armazena.")
    ],
    solution: D([N("viewers", "client", 80, 220, "viewers"), N("cdn", "cdn", 260, 220, "", { hitRatio: 0.98, respKB: 2 }), N("lb", "lb", 440, 220),
      N("app", "app", 620, 220, "comments API", { replicas: 4 }), N("db", "sql", 840, 120, "comments"),
      N("ps", "pubsub", 840, 320, "stream topic"), N("rt", "notifications", 1040, 320, "real-time push")],
    [E("viewers", "cdn"), E("cdn", "lb"), E("lb", "app"), E("app", "db"), E("app", "ps", { filter: "write" }), E("ps", "rt")])
  });

  /* AI architecture practice: requirements, call ownership and design review. */
  add({
    id: "ai-summarizer",
    group: "ai",
    aiKind: "summarizer",
    architecture: true,
    practiceRevision: 2,
    title: {"en": "Meeting transcript summaries"},
    brief: {"en": "Design a service that turns uploaded meeting transcripts into useful summaries. Some inputs are much longer than a model can accept, and processing may outlast the user’s connection. Show who accepts work, who coordinates processing, and where progress lives."},
    requirements: ["A user can leave after receiving an acknowledgement and return to find the result.", "Accepted transcripts and completed progress survive a processing-service restart.", "A transcript may contain 100,000 tokens; preserve its key decisions in the final summary.", "Handle bursts of uploads without tying acceptance to model latency."],
    reviewQuestions: ["What must be persisted before acknowledging the request, and what does that acknowledgement promise?", "Walk through splitting, processing and combining a long transcript. How would you evaluate information loss?", "What is resumed after a crash, how are completed steps identified, and how does the user fetch progress or cancel?"],
    referenceNotes: "This is one possible responsibility split. An application service can coordinate a fixed workflow; a separate orchestrator is optional. Call numbers show dependency order, with results returning to the caller.",
    settings: {"profile": "load", "targetRps": 2, "readRatio": 1, "seed": 312, "chaos": "off"},
    duration: 60,
    design: D([
      N("users", "client", 80, 180, "users"),
      N("api", "app", 330, 180, "application"),
      N("model", "llmgw", 680, 180, "language model")
    ], [
      E("users", "api"), E("api", "model")
    ]),
    solution: D([
      N("users", "client", 60, 120, "users"),
      N("api", "app", 280, 120, "request service"),
      N("input", "objstore", 520, 70, "original inputs"),
      N("jobs", "queue", 500, 260, "accepted work"),
      N("processor", "worker", 730, 260, "background processing"),
      N("model", "llmgw", 1000, 230, "language model"),
      N("state", "sql", 1000, 400, "progress and results")
    ], [
      E("users", "api"), E("api", "input"), E("api", "jobs"), E("jobs", "processor"), E("processor", "input"), E("processor", "model"), E("processor", "state")
    ]),
    goals: [G("arAsyncAcceptance", ">=", 100), G("arDurableInput", ">=", 100), G("arRecoveryState", ">=", 100), G("arApplicationOwnsModel", ">=", 100)],
    hints: [{"en": "Trace the user request while the slowest dependency is unavailable. Which responsibilities must still work?"}, {"en": "Try removing the processing service from the diagram. Which state and entry paths remain?"}]
  });

  add({
    id: "ai-faq",
    group: "ai",
    aiKind: "faq",
    architecture: true,
    practiceRevision: 2,
    title: {"en": "Handbook assistant"},
    brief: {"en": "Design an employee assistant for a large, changing company handbook. Answers should use relevant handbook passages and identify their sources. A handbook update and an employee question are different workloads: show both paths and who coordinates them."},
    requirements: ["Questions should not require sending the entire 500-page handbook to a model.", "Answers identify their evidence; missing evidence produces an explicit insufficient-information response.", "Updating the handbook must not block employees who are asking questions.", "The application remains responsible for assembling context and returning the answer."],
    reviewQuestions: ["Walk through ingestion separately from answering: what is stored, what is derived, and when?", "Who receives retrieved passages and constructs the generation request? Explain the order of those calls.", "How would you measure retrieval recall, citation support and unanswerable-question behavior using labeled cases?"],
    referenceNotes: "This is one possible responsibility split. An application service can coordinate a fixed workflow; a separate orchestrator is optional. Call numbers show dependency order, with results returning to the caller.",
    settings: {"profile": "load", "targetRps": 2, "readRatio": 1, "seed": 313, "chaos": "off"},
    duration: 60,
    design: D([
      N("users", "client", 80, 180, "users"),
      N("api", "app", 330, 180, "application"),
      N("model", "llmgw", 680, 180, "language model")
    ], [
      E("users", "api"), E("api", "model")
    ]),
    solution: D([
      N("users", "client", 50, 120, "employees"),
      N("api", "app", 280, 120, "answer coordinator"),
      N("retrieval", "memory", 540, 210, "retrieval"),
      N("index", "vectordb", 800, 210, "handbook index"),
      N("model", "llmgw", 540, 70, "answer generation"),
      N("updates", "scheduler", 50, 450, "handbook updates"),
      N("jobs", "queue", 280, 450, "indexing work"),
      N("indexer", "worker", 540, 450, "indexing service"),
      N("originals", "objstore", 800, 360, "handbook originals"),
      N("embed", "llmgw", 800, 520, "embedding model")
    ], [
      E("users", "api"), E("api", "retrieval"), E("retrieval", "index"), E("api", "model"), E("updates", "jobs"), E("jobs", "indexer"), E("indexer", "originals"), E("indexer", "embed"), E("indexer", "index")
    ]),
    goals: [G("arEvidenceFlow", ">=", 100), G("arApplicationOwnsModel", ">=", 100), G("arSeparateIngestion", ">=", 100)],
    hints: [{"en": "Name the owner of the final answer. Follow every piece of evidence back to its source."}, {"en": "Consider whether an employee query should perform the same work as a handbook update."}]
  });

  add({
    id: "ai-order-status",
    group: "ai",
    aiKind: "order",
    architecture: true,
    practiceRevision: 2,
    title: {"en": "Live order support"},
    brief: {"en": "Customers ask where their orders are. Company policy changes slowly, but order status changes constantly and each customer may only see their own orders. Design how the assistant obtains current facts and handles unavailable business systems."},
    requirements: ["A reported order status comes from the current business system, not model memory.", "One customer cannot obtain another customer’s order information.", "A business-system timeout results in an honest unavailable response.", "Keep business rules owned by the application or order service."],
    reviewQuestions: ["Where is customer identity obtained, and who enforces order ownership?", "Walk through the live read, the returned facts and the final answer. Do you need an agent loop for this workflow?", "How do malformed arguments, a missing order and a timed-out read produce different outcomes?"],
    referenceNotes: "This is one possible responsibility split. An application service can coordinate a fixed workflow; a separate orchestrator is optional. Call numbers show dependency order, with results returning to the caller.",
    settings: {"profile": "load", "targetRps": 2, "readRatio": 1, "seed": 314, "chaos": "off"},
    duration: 60,
    design: D([
      N("users", "client", 80, 180, "users"),
      N("api", "app", 330, 180, "application"),
      N("model", "llmgw", 680, 180, "language model"),
      N("orders", "sql", 700, 400, "existing order records")
    ], [
      E("users", "api"), E("api", "model")
    ]),
    solution: D([
      N("users", "client", 50, 180, "customers"),
      N("api", "app", 280, 180, "support coordinator"),
      N("identity", "auth", 520, 50, "customer identity"),
      N("lookup", "toolreg", 520, 220, "order adapter"),
      N("orders", "microservice", 760, 220, "order service"),
      N("db", "sql", 1000, 220, "orders"),
      N("model", "llmgw", 520, 380, "answer generation")
    ], [
      E("users", "api"), E("api", "identity"), E("api", "lookup"), E("lookup", "orders"), E("orders", "db"), E("api", "model")
    ]),
    goals: [G("arLiveRead", ">=", 100), G("arApplicationOwnsModel", ">=", 100)],
    hints: [{"en": "Separate facts that the model can explain from facts that must be read at request time."}, {"en": "Consider whether a tool adapter and a business service have the same responsibilities."}]
  });

  add({
    id: "ai-ingestion",
    group: "ai",
    aiKind: "ingestion",
    architecture: true,
    practiceRevision: 2,
    title: {"en": "Searchable document uploads"},
    brief: {"en": "Customers upload 10,000 documents in five minutes. Make each accepted document searchable, with progress visible to the customer. Processing dependencies have finite quotas and processing services can restart midway through a document."},
    requirements: ["Acknowledge accepted uploads within 500 ms without promising that indexing is already finished.", "Accepted originals and processing progress survive a worker restart.", "Ninety-nine percent of accepted documents become searchable within ten minutes.", "Retried work must not create duplicate visible chunks or leave a partially updated document active."],
    reviewQuestions: ["Show original storage, derived representations and the boundary between accepting and processing a document.", "Who performs each index write, and how does a document become visible only when ready?", "Define document/chunk identities, checkpoints, retry behavior and how you would prove the ten-minute target under quota limits."],
    referenceNotes: "This is one possible responsibility split. An application service can coordinate a fixed workflow; a separate orchestrator is optional. Call numbers show dependency order, with results returning to the caller.",
    settings: {"profile": "load", "targetRps": 2, "readRatio": 1, "seed": 315, "chaos": "off"},
    duration: 60,
    design: D([
      N("users", "client", 80, 180, "users"),
      N("api", "app", 330, 180, "application"),
      N("model", "llmgw", 680, 180, "language model")
    ], [
      E("users", "api"), E("api", "model")
    ]),
    solution: D([
      N("users", "client", 60, 120, "users"),
      N("api", "app", 280, 120, "request service"),
      N("input", "objstore", 520, 70, "original inputs"),
      N("jobs", "queue", 500, 260, "accepted work"),
      N("processor", "worker", 730, 260, "background processing"),
      N("model", "llmgw", 1000, 230, "embeddings"),
      N("state", "sql", 1000, 400, "progress and results"),
      N("index", "vectordb", 1000, 80, "search index")
    ], [
      E("users", "api"), E("api", "input"), E("api", "jobs"), E("jobs", "processor"), E("processor", "input"), E("processor", "model"), E("processor", "index"), E("processor", "state")
    ]),
    goals: [G("arAsyncAcceptance", ">=", 100), G("arDurableInput", ">=", 100), G("arRecoveryState", ">=", 100), G("arIndexWriter", ">=", 100)],
    hints: [{"en": "Write down what “accepted” and “searchable” mean as separate states."}, {"en": "Trace a failure after some derived data has been written but before the job reports completion."}]
  });

  add({
    id: "ai-tenant-search",
    group: "ai",
    aiKind: "tenant",
    architecture: true,
    practiceRevision: 2,
    title: {"en": "Company knowledge assistant"},
    brief: {"en": "One knowledge assistant serves 100 companies. Employees have different document permissions, and access can change after documents have been indexed. Companies sometimes ask identical questions. Design the answering path so employees receive current, authorized answers."},
    requirements: ["No company or employee may receive another user’s restricted evidence or answer.", "Revoking document access must affect answers within 30 seconds.", "Both newly generated and reused answers obey the current user’s access rights.", "Evidence selection and generation remain coordinated by application code."],
    reviewQuestions: ["How does identity reach every evidence access, and where is authorization enforced?", "What permission metadata lives in the index, where is its source of truth, and how do revocations propagate?", "If you reuse answers, describe cache scope, permission changes and a cross-tenant cache-hit test. Omitting answer caching is valid."],
    referenceNotes: "The application owns identity/access checks, cache lookup, evidence retrieval and generation. A cache hit returns after access checks; a miss continues to retrieval and generation. The cache does not call the model. Boxes are logical responsibilities, so these functions and stores may share deployments. ACL and cache-key semantics still require review.",
    settings: {"profile": "load", "targetRps": 2, "readRatio": 1, "seed": 316, "chaos": "off"},
    duration: 60,
    design: D([
      N("users", "client", 80, 180, "users"),
      N("api", "app", 330, 180, "application"),
      N("model", "llmgw", 680, 180, "language model")
    ], [
      E("users", "api"), E("api", "model")
    ]),
    solution: D([
      N("users", "client", 60, 180, "employees"),
      N("api", "app", 300, 180, "knowledge application"),
      N("identity", "auth", 560, 50, "user identity"),
      N("permissions", "sql", 560, 200, "access records"),
      N("cache", "cache", 560, 380, "authorized answers"),
      N("retrieval", "memory", 820, 270, "retrieval"),
      N("index", "vectordb", 1060, 270, "company documents"),
      N("model", "llmgw", 820, 70, "generation")
    ], [
      E("users", "api"), E("api", "identity"), E("api", "permissions"), E("api", "cache"), E("api", "retrieval"), E("retrieval", "index"), E("api", "model")
    ]),
    goals: [G("arEvidenceFlow", ">=", 100), G("arApplicationOwnsModel", ">=", 100), G("arCachedAccess", ">=", 100)],
    hints: [{"en": "Follow a question that is identical to one asked by an employee in another company."}, {"en": "Draw the path taken when an answer is already available, rather than only the cache-miss path."}]
  });

  add({
    id: "ai-research",
    group: "ai",
    aiKind: "research",
    architecture: true,
    practiceRevision: 2,
    title: {"en": "Long-running research reports"},
    brief: {"en": "Users request research reports that take several minutes and involve external sources. A user may disconnect, and the processing service may restart halfway through a report. Design acceptance, execution, progress and recovery."},
    requirements: ["Accepted reports remain discoverable after a disconnected request or processing restart.", "Retain completed evidence and resume unfinished work instead of silently starting over.", "Provide explicit completion, failure and cancellation states.", "Bound source fetching, model usage and total execution time."],
    reviewQuestions: ["What is the durable job identity, and what state is stored after each completed step?", "Which operations can safely repeat, and which require reconciliation? Explain recovery after a crash between a side effect and a checkpoint.", "Who decides when the report is complete, and how are missing evidence, budgets and cancellation enforced?"],
    referenceNotes: "This is one possible responsibility split. An application service can coordinate a fixed workflow; a separate orchestrator is optional. Call numbers show dependency order, with results returning to the caller.",
    settings: {"profile": "load", "targetRps": 2, "readRatio": 1, "seed": 317, "chaos": "off"},
    duration: 60,
    design: D([
      N("users", "client", 80, 180, "users"),
      N("api", "app", 330, 180, "application"),
      N("model", "llmgw", 680, 180, "language model")
    ], [
      E("users", "api"), E("api", "model")
    ]),
    solution: D([
      N("users", "client", 60, 120, "users"),
      N("api", "app", 280, 120, "request service"),
      N("input", "sql", 520, 70, "job records"),
      N("jobs", "queue", 500, 260, "accepted work"),
      N("processor", "orchestrator", 730, 260, "report workflow"),
      N("model", "llmgw", 1000, 230, "language model"),
      N("state", "sql", 1000, 400, "progress and results"),
      N("tools", "toolreg", 1000, 550, "source adapters"),
      N("sources", "thirdparty", 1240, 550, "external sources")
    ], [
      E("users", "api"), E("api", "input"), E("api", "jobs"), E("jobs", "processor"), E("processor", "input"), E("processor", "model"), E("processor", "state"), E("processor", "tools"), E("tools", "sources")
    ]),
    goals: [G("arAsyncAcceptance", ">=", 100), G("arDurableInput", ">=", 100), G("arRecoveryState", ">=", 100), G("arApplicationOwnsModel", ">=", 100)],
    hints: [{"en": "An open stream is a presentation mechanism. What other state must exist for reconnection?"}, {"en": "Distinguish the workflow’s state from the data returned by its dependencies."}]
  });

  add({
    id: "ai-refunds",
    group: "ai",
    aiKind: "refund",
    architecture: true,
    practiceRevision: 2,
    title: {"en": "Customer refunds"},
    brief: {"en": "A support assistant can help customers request refunds. Some payment requests commit successfully but time out before returning a result, and both the assistant and execution infrastructure may retry. Design the boundary between a model’s proposal and an authorized business action."},
    requirements: ["Only an authorized, approved action may produce a refund.", "Repeating an operation must not issue another refund for the same intended action.", "A timeout must not be interpreted as proof that no payment occurred.", "Uncertain results remain visible and are reconciled or escalated."],
    reviewQuestions: ["Who validates the proposed amount, customer, order and approval before execution?", "Where is the stable operation identity created and stored? Trace a committed payment followed by a timeout and retry.", "What must be queried or reconciled before telling the customer that the refund succeeded or failed?"],
    referenceNotes: "This is one possible responsibility split. An application service can coordinate a fixed workflow; a separate orchestrator is optional. Call numbers show dependency order, with results returning to the caller.",
    settings: {"profile": "load", "targetRps": 2, "readRatio": 1, "seed": 318, "chaos": "off"},
    duration: 60,
    design: D([
      N("users", "client", 80, 180, "users"),
      N("api", "app", 330, 180, "application"),
      N("model", "llmgw", 680, 180, "language model"),
      N("payment", "payment", 960, 180, "payment provider")
    ], [
      E("users", "api"), E("api", "model"), E("model", "payment")
    ]),
    solution: D([
      N("users", "client", 50, 180, "customers"),
      N("api", "app", 280, 180, "support coordinator"),
      N("model", "llmgw", 530, 70, "proposed action"),
      N("business", "microservice", 530, 300, "refund service"),
      N("identity", "auth", 800, 180, "customer identity"),
      N("ledger", "sql", 800, 320, "approval and operation records"),
      N("payment", "payment", 800, 470, "payment provider")
    ], [
      E("users", "api"), E("api", "model"), E("api", "business"), E("business", "identity"), E("business", "ledger"), E("business", "payment")
    ]),
    goals: [G("arActionBoundary", ">=", 100), G("arActionCoordination", ">=", 100)],
    hints: [{"en": "Separate proposing an action from having the authority to execute it."}, {"en": "Walk through the exact moment at which payment state becomes uncertain."}]
  });

  add({
    id: "ai-model-routing",
    group: "ai",
    aiKind: "routing",
    architecture: true,
    practiceRevision: 2,
    title: {"en": "Ticket triage with multiple models"},
    brief: {"en": "An AI service classifies incoming support tickets. Most are straightforward, some are ambiguous, and a provider may become unavailable. Design how model choice, result checking and recovery fit together while controlling cost and preserving classification quality."},
    requirements: ["Avoid making every ticket pay for the strongest model or for every available model.", "Ambiguous results can be escalated rather than accepted blindly.", "A provider outage must not make every classification path unavailable.", "Measure cost per accepted outcome and quality on the same labeled workload."],
    reviewQuestions: ["What evidence determines initial model selection and escalation? Why is this more than blind load balancing?", "Who validates the returned classification and decides to accept, retry, escalate or stop?", "What happens when either provider fails? Explain independence of fallbacks, bounded retries and how you would test quality and cost."],
    referenceNotes: "The application calls a routing boundary, receives one selected model result, then validates it. API Gateway represents exclusive dispatch among same-type model targets in the load engine; the selection/escalation policy is a design-review responsibility, not something a blind load balancer proves.",
    settings: {"profile": "load", "targetRps": 2, "readRatio": 1, "seed": 319, "chaos": "off"},
    duration: 60,
    design: D([
      N("users", "client", 80, 180, "users"),
      N("api", "app", 330, 180, "application"),
      N("model", "llmgw", 680, 180, "language model")
    ], [
      E("users", "api"), E("api", "model")
    ]),
    solution: D([
      N("users", "client", 50, 180, "incoming tickets"),
      N("api", "app", 280, 180, "triage application"),
      N("router", "apigw", 530, 120, "model routing service"),
      N("small", "llmgw", 800, 50, "small model"),
      N("strong", "llmgw", 800, 220, "strong model"),
      N("validation", "safety", 530, 370, "result validation")
    ], [
      E("users", "api"), E("api", "router"), E("router", "small"), E("router", "strong"), E("api", "validation")
    ]),
    goals: [G("arModelChoice", ">=", 100), G("arAlternateModel", ">=", 100), G("arValidationBoundary", ">=", 100)],
    hints: [{"en": "Draw who chooses a model separately from the model itself."}, {"en": "Trace one easy ticket, one uncertain result and one provider outage. Should they follow identical paths?"}]
  });

  /* the classic interview problems (case-study pages) form their own group in the menu */
  ["url-shortener", "news-feed", "chat", "ride-sharing", "video-streaming", "notification-system", "payment-system", "search-autocomplete"]
    .forEach(function (id) { LIST.forEach(function (s) { if (s.id === id) s.group = "case"; }); });

  var BY_ID = {};
  var ALL = LIST.concat(COURSE);
  ALL.forEach(function (s) { BY_ID[s.id] = s; });

  return {
    LIST: LIST, COURSE: COURSE, ALL: ALL, BY_ID: BY_ID,
    get: function (id) { return BY_ID[id] || null; },
    ids: function () { return LIST.map(function (s) { return s.id; }); },
    clone: clone
  };
});
