# Scenario guide

Every scenario of the [System Design Playground](../index.md) is a small lab: a realistic situation, an initial design that **fails** its goals for a reason, and one possible fix. Each section below says what the scenario teaches, what to try, what to watch, the goals, and questions to discuss in class. The embedded simulators are compact (run controls, metrics and parameters); use **Open in the playground** (↗) to edit the structure.

## How to work on a scenario

1. **Predict before you run.** Estimate utilization (ρ = λ / μ) and the queue behaviour from the numbers in the brief.
2. **Run the initial design** and read the Report: which goal fails, and what is the bottleneck?
3. **Change one thing at a time** and run again with the same seed — differences are then caused by your change, not by luck.
4. **Change the seed** at the end: a good design passes with any seed.
5. **Explain the numbers** with the formulas of the [manual](../index.md#how-the-model-works).

!!! tip "Exercise"

    The graded exercise *playground-design* asks you to solve three scenarios and submit the exported JSON plus a short rationale (the Report has a **Copy report (Markdown)** button).

## All scenarios

| Scenario | Lesson |
|---|---|
| [Monolith: find the breaking point](#monolith) | Every system has a breaking point, and the first component to saturate decides it |
| [Scale out behind a load balancer](#scale-out) | Horizontal scaling needs headroom for failures (N+1), and a load balancer only routes around a dead replica after it detects it |
| [Read-heavy catalog: add a cache](#read-heavy-cache) | A cache in front of the database cuts its read load to reads × (1 − hit ratio); a cold cache sends everything back to the database at once (stampede) |
| [Offload static content to a CDN](#cdn-static) | Static and cacheable content belongs at the edge |
| [Read replicas and replication lag](#db-replicas) | Read replicas multiply read capacity but not write capacity, and they serve slightly old data (replication lag) |
| [Partitions and the hot key](#sharding) | Partitioning scales with the number of partitions only while keys are spread evenly; a hot key concentrates the load on one partition |
| [A queue absorbs the spike](#async-queue) | A queue decouples the user from slow work |
| [Publish an event, let consumers react](#event-fanout) | With an event log each consumer group reads at its own pace |
| [Cascading failure: a slow dependency](#cascading-failure) | A slow dependency without timeouts exhausts the caller's threads (Little's Law) and takes down requests that never touch it |
| [Retry storm: when retries make it worse](#retry-storm) | Immediate retries multiply the load on a struggling service; when answers exceed the timeout, every attempt fails and the system stays down after the trigger is gone (metastable failure) |
| [Rate limiting protects the backend](#rate-limiter) | Rejecting excess traffic fast (429) protects the backend and the real users; letting it queue degrades everyone |
| [Surviving a region outage](#multi-region) | Surviving a region needs a full second stack and a way to move users |
| [Serverless burst: cold starts and limits](#serverless-burst) | Functions scale per request |
| [Flash sale: a limited-stock launch](#flash-sale) | A flash sale is designed for the peak |
| [URL shortener (sho.rt/xyz)](#url-shortener) | A read-heavy key lookup |
| [News feed: fan-out on write vs on read](#news-feed) | Fan-out on write moves work from the read path (frequent) to the write path (rare) |
| [Chat for a live event](#chat) | Chat separates storing messages (partitioned, append-heavy) from delivering them (pub/sub to the connected servers) |
| [Ride-sharing: a write-heavy geo index](#ride-sharing) | Location updates are a write-heavy stream |
| [Video streaming: CDN + object store + transcoding](#video-streaming) | Video is bytes at the edge plus heavy batch work in the background |
| [Notification system](#notification-system) | Notifications are asynchronous by nature |
| [Payments: retries need idempotency](#payment-system) | A retry after a timeout may repeat an operation that already happened |
| [Search autocomplete](#search-autocomplete) | Autocomplete is a latency problem |
| [AI support assistant (RAG + tools)](#ai-assistant) | In an LLM application latency and cost scale with the number of model calls |
| [You can't fix what you don't measure](#observability-stack) | Observability changes outcomes |
| [Microservices on Kubernetes: pods vs nodes](#microservices) | The HPA adds pods, only nodes add room; every synchronous hop adds to the user's wait |
| [Kubernetes: losing a node](#k8s-node-failure) | Plan N+1 for nodes too: a lost node takes several pods at once, and they come back only if there is room |
| [Database failover: RTO and RPO](#db-failover) | A failover costs the time without a primary (RTO) and the writes not yet replicated (RPO) |
| [Ticketing: 2 M fans, 60 k seats](#ticketing) | Polls at the edge, joins in a waiting room, shoppers admitted at ≈ 33/s |
| [Distributed cache: memory or throughput?](#distributed-cache) | Size a cache by memory and by throughput; the hit ratio sizes the database |
| [File sync: keep the bytes off your servers](#file-sync) | Large uploads go straight to object storage with pre-signed URLs; the API only handles metadata |
| [Proximity search: businesses near me](#proximity-search) | "Near me" is a geospatial index lookup (geohash cells), with the popular cells cached |
| [Online judge: the contest starts](#code-judge) | Slow, untrusted work runs from a queue; the API answers "pending" and the queue lag is the wait for a verdict |
| [Online auction: the last minute](#online-auction) | Watchers read a cached price; bids go to an ordered log partitioned by auction |
| [Ad click aggregator: count, don't store](#ad-click-aggregator) | High-rate events are aggregated in a stream; dashboards read the counts, not the raw events |
| [Web crawler: slow sites hold the fetchers](#web-crawler) | I/O-bound workers are sized by threads ÷ latency; timeouts bound what a slow site can take |
| [Post search: index asynchronously](#post-search) | Indexing leaves the write path through a log and bulk indexers; repeated queries are cached |
| [Live comments: a million viewers polling](#live-comments) | Identical polls are answered at the edge; new comments are pushed through pub/sub |
| [Meeting transcript summaries](#ai-summarizer) | A user can leave after receiving an acknowledgement and return to find the result. |
| [Handbook assistant](#ai-faq) | Questions should not require sending the entire 500-page handbook to a model. |
| [Live order support](#ai-order-status) | A reported order status comes from the current business system, not model memory. |
| [Searchable document uploads](#ai-ingestion) | Acknowledge accepted uploads within 500 ms without promising that indexing is already finished. |
| [Company knowledge assistant](#ai-tenant-search) | No company or employee may receive another user’s restricted evidence or answer. |
| [Long-running research reports](#ai-research) | Accepted reports remain discoverable after a disconnected request or processing restart. |
| [Customer refunds](#ai-refunds) | Only an authorized, approved action may produce a refund. |
| [Ticket triage with multiple models](#ai-model-routing) | Avoid making every ticket pay for the strongest model or for every available model. |

## Monolith: find the breaking point { #monolith }

Version 1 of the app: one app server and one PostgreSQL. The breakpoint profile ramps the load until errors pass 5% or p99 explodes. Where does it break, and which component breaks first? Make it survive 2 000 req/s without spending more than 2 000 USD/month.

- **Lesson:** Every system has a breaking point, and the first component to saturate decides it. Scaling one tier moves the bottleneck to the next one.
- **Setup:** `monolith` · profile `breakpoint` · target 600 req/s · 90% reads · seed 7 · chaos `off`
- **Goals:** breaking point ≥ 2,000 req/s · cost/month < US$ 2,000
- **Try:** Press ▶ and read the Report: breaking point and bottleneck. Add a Load Balancer in front of the app and raise its replicas; run again.
- **Observe:** The knee (p99 doubles) comes well before the break. After scaling the app, the database becomes the bottleneck.
- **Related:** [What is system design](../../2027.1/classes/intro/index.md) · [Estimation](../../2027.1/classes/estimation/index.md)

<div class="sdp" data-scenario="monolith" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. Why does latency grow slowly at first and then explode near ρ = 1?
    2. With 6 replicas, which component breaks first, and at what rate? Check it with ρ = λ / μ.
    3. What would you do next if the target were 5 000 req/s?

## Scale out behind a load balancer { #scale-out }

The catalog gets 1 500 req/s. Two replicas are not enough, and at t = 80 s one replica crashes. The load balancer keeps sending it traffic until it notices (30 s without health checks). Meet the goals with headroom for one failure (N+1).

- **Lesson:** Horizontal scaling needs headroom for failures (N+1), and a load balancer only routes around a dead replica after it detects it.
- **Setup:** `scale-out` · profile `load` · target 1,500 req/s · 90% reads · seed 11 · chaos `off` · scripted events: t = 80 s — one catalog replica crashes
- **Goals:** error rate < 1% · p99 < 250 ms · cost/month < US$ 1,800
- **Try:** Raise the app replicas until ρ ≈ 0.6. Then add a Health Check connected to the Load Balancer.
- **Observe:** At t = 80 s one replica dies: errors last ~30 s without health checks and ~3 s with them. The survivors must absorb its share.
- **Related:** [Traffic & edge](../../2027.1/classes/edge/index.md) · [Reliability](../../2027.1/classes/reliability/index.md)

<div class="sdp" data-scenario="scale-out" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. How many replicas do you need so that losing one keeps ρ below 0.85?
    2. Why does a crashed replica keep receiving requests for a while?
    3. What does detection time do to availability (MTTR = detect + repair)?

## Read-heavy catalog: add a cache { #read-heavy-cache }

Users browse the catalog: 3 000 req/s, 95% reads. The app tier is fine; the database is not. At t = 100 s the cache (once you have one) is flushed: will the database survive the stampede of misses?

- **Lesson:** A cache in front of the database cuts its read load to reads × (1 − hit ratio); a cold cache sends everything back to the database at once (stampede).
- **Setup:** `read-heavy-cache` · profile `load` · target 3,000 req/s · 95% reads · seed 3 · chaos `off` · scripted events: t = 100 s — cache flushed (deploy / restart)
- **Goals:** p99 < 100 ms · error rate < 0.5% · cost/month < US$ 3,000
- **Try:** Insert a Cache between app and database. Run; then turn request coalescing on and compare what happens at t = 100 s.
- **Observe:** The database utilization drops with the hit ratio. At the flush, without coalescing, it saturates for several seconds.
- **Related:** [Caching](../../2027.1/classes/caching/index.md)

<div class="sdp" data-scenario="read-heavy-cache" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. With 95% reads and an 88% hit ratio, what is the database load at 3 000 req/s?
    2. Why does cache-aside lower the hit ratio when writes are frequent?
    3. Name two other ways to survive a stampede.

## Offload static content to a CDN { #cdn-static }

Product pages are full of images, styles and scripts: 3 000 req/s, 98% reads, served by the app from object storage. Users far from the region wait, and the app is saturated. Serve them from the edge.

- **Lesson:** Static and cacheable content belongs at the edge: the origin only sees misses and writes, and users get a nearby answer.
- **Setup:** `cdn-static` · profile `load` · target 3,000 req/s · 98% reads · seed 5 · chaos `off`
- **Goals:** p99 < 150 ms · error rate < 0.5%
- **Try:** Put a CDN after the DNS (dns → cdn → lb). Lower the app replicas and compare latency and cost.
- **Observe:** The app tier falls from saturated to ~35% with fewer replicas. The CDN egress becomes the largest cost line.
- **Related:** [Traffic & edge](../../2027.1/classes/edge/index.md)

<div class="sdp" data-scenario="cdn-static" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. What decides the hit ratio of a CDN (TTL, cache key, content)?
    2. Why is egress (USD/GB) often the largest line of a media site?
    3. How would you invalidate an image that changed?

## Read replicas and replication lag { #db-replicas }

4 000 req/s with 10% writes overload the single PostgreSQL primary. Read replicas take reads but never writes, and they lag behind the primary. Keep the lag under 1 s.

- **Lesson:** Read replicas multiply read capacity but not write capacity, and they serve slightly old data (replication lag).
- **Setup:** `db-replicas` · profile `load` · target 4,000 req/s · 90% reads · seed 13 · chaos `off`
- **Goals:** p99 < 150 ms · error rate < 0.5% · replication lag < 1 s
- **Try:** Add 2 read replicas to the database. Then raise the write share in the toolbar to 30% and watch the primary.
- **Observe:** Reads spread over 1 + replicas; the primary keeps every write and its lag grows with the write load.
- **Related:** [Databases](../../2027.1/classes/databases/index.md)

<div class="sdp" data-scenario="db-replicas" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. Which reads can tolerate lag, and which must go to the primary (read-your-writes)?
    2. At what write share do replicas stop helping?
    3. What comes after replicas when writes are the limit?

## Partitions and the hot key { #sharding }

Stock lookups and updates (50% writes) at 8 000 req/s on a key-value store with 2 partitions. At t = 60 s a celebrity posts a link to one product: one key gets a huge share of the traffic for a minute. More partitions fix the average — do they fix the hot key?

- **Lesson:** Partitioning scales with the number of partitions only while keys are spread evenly; a hot key concentrates the load on one partition.
- **Setup:** `sharding` · profile `load` · target 8,000 req/s · 50% reads · seed 17 · chaos `off` · scripted events: t = 60 s — celebrity effect: one hot key
- **Goals:** error rate < 0.5% · p99 < 100 ms
- **Try:** Raise the partitions to 8 and run. Then add a Cache in front of the NoSQL store for the hot reads.
- **Observe:** At t = 60 s the celebrity effect starts: with 8 partitions the busiest one still saturates; the cache absorbs the hot reads.
- **Related:** [Databases](../../2027.1/classes/databases/index.md) · [Caching](../../2027.1/classes/caching/index.md)

<div class="sdp" data-scenario="sharding" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. If the hottest key gets 45% of the traffic, what is the load on its partition with P = 8? With P = 64?
    2. Besides caching, how can you split a hot key (salting, replicas of the key)?
    3. Why is consistent hashing used to place keys?

## A queue absorbs the spike { #async-queue }

Each order generates a PDF receipt (50 ms of work). Today the order service waits for it. The spike profile multiplies the load by 5 for 30 s: the workers cannot keep up and orders fail. Let the user go and do the work later.

- **Lesson:** A queue decouples the user from slow work: the producer waits only for the broker; the backlog absorbs the spike and drains afterwards.
- **Setup:** `async-queue` · profile `spike` · target 150 req/s · 0% reads · seed 19 · chaos `off`
- **Goals:** error rate < 0.1% · p99 < 100 ms · consumer lag < 60 s
- **Try:** Replace the call app → worker by app → Message Queue → worker. Run the spike profile again.
- **Observe:** Errors disappear; the backlog grows during the 30 s spike and drains after it. Consumer lag = backlog ÷ drain rate.
- **Related:** [Messaging](../../2027.1/classes/messaging/index.md) · [Compute & services](../../2027.1/classes/compute/index.md)

<div class="sdp" data-scenario="async-queue" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. How long does the backlog take to drain with 4 workers? Compute it before running.
    2. What happens if the spike never ends (producers > consumers forever)?
    3. Why must the consumer be idempotent with at-least-once delivery?

## Publish an event, let consumers react { #event-fanout }

When an order is placed, the app notifies the buyer, updates analytics and re-indexes availability — today with three synchronous calls in a row. At t = 60 s analytics becomes 20× slower and orders slow down with it. Decouple the order service from its consumers.

- **Lesson:** With an event log each consumer group reads at its own pace: a slow consumer lags behind without slowing the producer or the others.
- **Setup:** `event-fanout` · profile `load` · target 400 req/s · 0% reads · seed 23 · chaos `off` · scripted events: t = 60 s — analytics is 20× slower
- **Goals:** p99 < 120 ms · error rate < 0.1% · consumer lag < 60 s
- **Try:** Publish to Kafka (app → kafka) and let notification, analytics and the indexer consume (kafka → each).
- **Observe:** When analytics slows down at t = 60 s, only its lag grows; order latency stays flat.
- **Related:** [Messaging](../../2027.1/classes/messaging/index.md)

<div class="sdp" data-scenario="event-fanout" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. What decides the maximum parallelism of a consumer group?
    2. What guarantees do you lose compared with synchronous calls (ordering, read-your-writes)?
    3. How do you publish the event and write the order atomically (outbox)?

## Cascading failure: a slow dependency { #cascading-failure }

Half of the catalog pages call an external recommendations API. At t = 60 s it becomes 20× slower (3 s). Without timeouts every request holds a thread while waiting; the thread pools run out and the whole catalog fails — although the app's CPU is almost idle (Little's Law: threads = λ × W).

- **Lesson:** A slow dependency without timeouts exhausts the caller's threads (Little's Law) and takes down requests that never touch it.
- **Setup:** `cascading-failure` · profile `load` · target 800 req/s · 90% reads · seed 29 · chaos `off` · scripted events: t = 60 s — recommendations API 20× slower
- **Goals:** error rate < 1% · p99 < 500 ms
- **Try:** Run as is and read the bottleneck in the Report. Then set a 300 ms timeout on app → recommendations, then add a fallback and a circuit breaker.
- **Observe:** Without a timeout the app shows threads exhausted with idle CPU. With the timeout only the recommendation calls fail; with the fallback nobody does.
- **Related:** [Reliability](../../2027.1/classes/reliability/index.md)

<div class="sdp" data-scenario="cascading-failure" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. With 800 req/s, half calling a 3 s dependency, how many threads are busy? (L = λ × W)
    2. Why does a timeout alone not reach zero errors here?
    3. What would a bulkhead change?

## Retry storm: when retries make it worse { #retry-storm }

The inventory service retries every failed query 3 times, immediately, with a 100 ms timeout. At t = 60 s the database restarts (8 s). When it comes back, it receives up to 4× the normal load, its queue fills, answers take longer than the timeout… and it never recovers, although the trigger is long gone (a metastable failure).

- **Lesson:** Immediate retries multiply the load on a struggling service; when answers exceed the timeout, every attempt fails and the system stays down after the trigger is gone (metastable failure).
- **Setup:** `retry-storm` · profile `load` · target 2,000 req/s · 90% reads · seed 31 · chaos `off` · scripted events: t = 60 s — database restarts
- **Goals:** error rate < 15% · p99 < 300 ms
- **Try:** Run and watch the edge app → db after the 8 s restart. Then enable the circuit breaker; try also 1 retry with exponential backoff + jitter.
- **Observe:** The edge rate jumps to ~4× and errors never recover. With the breaker the database drains its queue and the system recovers.
- **Related:** [Reliability](../../2027.1/classes/reliability/index.md)

<div class="sdp" data-scenario="retry-storm" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. With p = 0.9 failures per attempt and 3 retries, what is the load multiplier?
    2. Why does a longer timeout or a shorter queue also break the loop?
    3. What is a retry budget?

## Rate limiting protects the backend { #rate-limiter }

1 000 req/s of real users — plus scraper bots sending twice that. The catalog melts down for everybody. Reject the excess fast at the gateway (429) instead of letting it queue behind the real users.

- **Lesson:** Rejecting excess traffic fast (429) protects the backend and the real users; letting it queue degrades everyone.
- **Setup:** `rate-limiter` · profile `load` · target 1,000 req/s · 90% reads · seed 37 · chaos `off`
- **Goals:** error rate < 1% · p99 < 200 ms
- **Try:** Set a rate limit on the API Gateway below the app capacity (e.g. 1 500 req/s). Alternatively, add a WAF in front.
- **Observe:** Bots are cut first (per-client token buckets), real users keep low latency and the app stays below saturation.
- **Related:** [Traffic & edge](../../2027.1/classes/edge/index.md)

<div class="sdp" data-scenario="rate-limiter" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. Token bucket vs. sliding window: which allows bursts?
    2. Where should the limit live in a system with many gateway replicas?
    3. Why is a 429 better for the client than a timeout?

## Surviving a region outage { #multi-region }

The app runs in one cloud region. At t = 60 s the whole region goes down. Build a second region and let DNS move users there. Failover time = detection + DNS TTL: check both.

- **Lesson:** Surviving a region needs a full second stack and a way to move users: DNS failover takes detection plus TTL.
- **Setup:** `multi-region` · profile `load` · target 1,000 req/s · 90% reads · seed 41 · chaos `off` · scripted events: t = 60 s — region sa-east-1 is down
- **Goals:** availability ≥ 95% · p99 < 80 ms
- **Try:** Draw a second VPC (another region) with LB, app and database; connect DNS to it, attach a Health Check to the DNS and lower its TTL.
- **Observe:** At t = 60 s the first region disappears. Errors last about (3 s + TTL) for the users routed there.
- **Related:** [Reliability](../../2027.1/classes/reliability/index.md) · [Traffic & edge](../../2027.1/classes/edge/index.md)

<div class="sdp" data-scenario="multi-region" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. Active-active or active-passive: which loses fewer requests here?
    2. What happens to data written in the lost region (RPO)?
    3. Why must each app call its own region's database?

## Serverless burst: cold starts and limits { #serverless-burst }

A discount-coupon check runs as a function. The spike profile jumps from 200 to 2 000 req/s. New instances start cold (600 ms) and the account has a concurrency limit of 50. Instances needed = λ × W (Little's Law).

- **Lesson:** Functions scale per request: instances = λ × W, cold starts hit exactly when traffic jumps, and the concurrency limit throttles the rest.
- **Setup:** `serverless-burst` · profile `spike` · target 200 req/s · 90% reads · seed 43 · chaos `off`
- **Goals:** error rate < 0.5% · p99 < 300 ms · cost/month < US$ 5,000
- **Try:** Raise the concurrency limit, run the spike; then add provisioned instances and compare p99 and cost.
- **Observe:** Throttling (429) disappears with a higher limit; cold starts show up in p99 at the start of the spike until warm instances exist.
- **Related:** [Compute & services](../../2027.1/classes/compute/index.md)

<div class="sdp" data-scenario="serverless-burst" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. How many instances do 2 000 req/s × 40 ms need?
    2. Why do cold starts increase the number of instances needed?
    3. When is a container with autoscaling cheaper than functions?

## Flash sale: a limited-stock launch { #flash-sale }

A limited-stock product goes on sale at t = 60 s: traffic jumps 20× (to ~6 000 req/s) for 90 s. 80% of requests read the product page, 20% try to buy. The database holds the stock (no overselling!) and the payment provider accepts 500 req/s. Today everything collapses. Design for the peak: serve reads from the edge and caches, and put buyers in a waiting room (queue) drained at the speed the inventory and the payment provider can handle.

- **Lesson:** A flash sale is designed for the peak: reads are absorbed by the edge and caches, and buyers wait in a queue drained at the pace of the inventory and the payment provider.
- **Setup:** `flash-sale` · profile `load` · target 300 req/s · 80% reads · seed 2027 · chaos `off` · scripted events: t = 60 s — the sale opens
- **Goals:** p99 < 300 ms · error rate < 1% · consumer lag < 300 s
- **Try:** Follow the hints one at a time: CDN, catalog cache, then API Gateway routing writes to a waiting-room queue consumed by order workers.
- **Observe:** With the waiting room, errors vanish and p99 stays low; the consumer lag is how long a buyer waits in line.
- **Related:** [Case studies](../../2027.1/classes/case-studies/index.md) · [Messaging](../../2027.1/classes/messaging/index.md) · [Caching](../../2027.1/classes/caching/index.md)

<div class="sdp" data-scenario="flash-sale" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. How many items can be sold per second if payment allows 500 req/s and each order takes one call?
    2. How do you avoid selling more items than are in stock (reservations, SELECT … FOR UPDATE)?
    3. How would you tell users their position in the line?

## URL shortener (sho.rt/xyz) { #url-shortener }

Every order e-mail and shared post carries a short link. 5 000 redirects/s, 99% reads, a few writes (new links). The classic interview problem: what is the read path, and what store fits a key → URL lookup?

- **Lesson:** A read-heavy key lookup: cache + key-value store, sized with simple arithmetic.
- **Setup:** `url-shortener` · profile `load` · target 5,000 req/s · 99% reads · seed 47 · chaos `off`
- **Goals:** p99 < 50 ms · error rate < 0.1% · cost/month < US$ 3,500
- **Try:** Replace the SQL database by Cache → NoSQL and size the app tier.
- **Observe:** p99 drops to a few tens of ms; most redirects never reach the store.
- **Related:** [Case studies](../../2027.1/classes/case-studies/index.md)

<div class="sdp" data-scenario="url-shortener" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. How many short codes fit in 7 base-62 characters?
    2. How do you generate unique codes without coordination?
    3. 301 or 302 redirect: which one lets you count clicks?

## News feed: fan-out on write vs on read { #news-feed }

The feed shows posts from the accounts a user follows. Today the feed is assembled when it is read: a heavy query (40 ms) that merges hundreds of sources. 2 000 req/s, 95% reads. Precompute timelines when something is posted instead.

- **Lesson:** Fan-out on write moves work from the read path (frequent) to the write path (rare): a feed read becomes one key lookup.
- **Setup:** `news-feed` · profile `load` · target 2,000 req/s · 95% reads · seed 53 · chaos `off`
- **Goals:** p99 < 100 ms · error rate < 0.5% · consumer lag < 10 s
- **Try:** Route reads to a timeline cache over a NoSQL store, and writes to the posts database plus Kafka → fan-out workers → timelines.
- **Observe:** Reads become cheap; the fan-out lag shows how long a post takes to reach the timelines.
- **Related:** [Case studies](../../2027.1/classes/case-studies/index.md) · [Messaging](../../2027.1/classes/messaging/index.md)

<div class="sdp" data-scenario="news-feed" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. What breaks when an account has 10 million followers?
    2. How does a hybrid approach treat celebrities?
    3. Which consistency does a feed really need?

## Chat for a live event { #chat }

During a live event, users chat in its room: 2 000 req/s, half are new messages. Each message is stored in PostgreSQL and delivered synchronously before the sender gets an answer. Writes overload the database and the sender waits for every delivery.

- **Lesson:** Chat separates storing messages (partitioned, append-heavy) from delivering them (pub/sub to the connected servers).
- **Setup:** `chat` · profile `load` · target 2,000 req/s · 50% reads · seed 59 · chaos `off`
- **Goals:** p99 < 80 ms · error rate < 0.1% · consumer lag < 2 s
- **Try:** Store messages in a NoSQL store and publish them to Pub/Sub consumed by the delivery service.
- **Observe:** Write load spreads over partitions; senders no longer wait for delivery.
- **Related:** [Case studies](../../2027.1/classes/case-studies/index.md) · [Traffic & edge](../../2027.1/classes/edge/index.md)

<div class="sdp" data-scenario="chat" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. How does a message reach a user connected to another websocket server?
    2. How do you order messages in a room?
    3. What happens to messages for users who are offline?

## Ride-sharing: a write-heavy geo index { #ride-sharing }

Drivers send their position every 4 s: 20 000 req/s, 90% writes, while riders query nearby drivers. A relational database cannot absorb that write rate. Keep only the latest position per driver in a partitioned store and stream the history.

- **Lesson:** Location updates are a write-heavy stream: keep only the latest position in a partitioned store and send the history asynchronously.
- **Setup:** `ride-sharing` · profile `load` · target 20,000 req/s · 10% reads · seed 61 · chaos `off`
- **Goals:** p99 < 100 ms · error rate < 0.5% · cost/month < US$ 6,000
- **Try:** Replace SQL by a partitioned NoSQL geo index; sample positions into Kafka for analytics.
- **Observe:** The relational primary was saturated by writes; the partitioned store absorbs them with headroom.
- **Related:** [Case studies](../../2027.1/classes/case-studies/index.md) · [Databases](../../2027.1/classes/databases/index.md)

<div class="sdp" data-scenario="ride-sharing" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. How many writes/s do 1 million drivers sending every 4 s generate?
    2. How do you find drivers within 2 km (geohash, quadtree, H3)?
    3. What happens to the geo index when a stadium empties?

## Video streaming: CDN + object store + transcoding { #video-streaming }

Creators upload videos; users watch them. 2 000 segment requests/s from viewers go through the app, and each upload is transcoded synchronously (20 s per video) while the uploader waits. Serve segments from the edge and transcode in the background.

- **Lesson:** Video is bytes at the edge plus heavy batch work in the background: CDN + object store for viewers, a queue + workers for transcoding.
- **Setup:** `video-streaming` · profile `load` · target 2,000 req/s · 99% reads · seed 67 · chaos `off`
- **Goals:** p99 < 150 ms · error rate < 0.5% · consumer lag < 120 s
- **Try:** Viewers → CDN → Object Store; uploads → API Gateway → app → queue → transcoders.
- **Observe:** The app tier almost disappears from the viewing path; the transcoding backlog drains at replicas × 1/20 s.
- **Related:** [Case studies](../../2027.1/classes/case-studies/index.md) · [Traffic & edge](../../2027.1/classes/edge/index.md)

<div class="sdp" data-scenario="video-streaming" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. Why are video segments ideal for caching?
    2. How many transcoders do 0.5 uploads/s of 20 s jobs need (Little)?
    3. Why produce several bitrates (adaptive streaming)?

## Notification system { #notification-system }

Every purchase sends a confirmation e-mail (50 req/s), and a scheduler sends 6 000 digest e-mails every 2 minutes — all at the same instant. The e-mail provider accepts 200 sends/s. Today buyers wait for the provider and fail whenever the digest burst arrives.

- **Lesson:** Notifications are asynchronous by nature: queue them, pace them to the provider quota, and never fire scheduled jobs all at once.
- **Setup:** `notification-system` · profile `load` · target 50 req/s · 0% reads · seed 71 · chaos `off`
- **Goals:** error rate < 0.5% · p99 < 150 ms · consumer lag < 120 s
- **Try:** Put a queue in front of the notification service and spread the scheduler's jobs over 60 s.
- **Observe:** Buyers no longer feel the digest burst; the provider quota sets the drain rate.
- **Related:** [Case studies](../../2027.1/classes/case-studies/index.md) · [Compute & services](../../2027.1/classes/compute/index.md)

<div class="sdp" data-scenario="notification-system" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. Why is a scheduled burst a self-inflicted spike?
    2. How would you give transactional e-mails priority over digests?
    3. How do you avoid sending the same e-mail twice?

## Payments: retries need idempotency { #payment-system }

Orders call the payment provider synchronously with a 1 s timeout and 2 immediate retries. At t = 60 s the provider becomes 4× slower: calls time out, and each retry after a timeout may charge the card AGAIN — the provider did receive the first attempt. Make payments safe and keep buyers fast.

- **Lesson:** A retry after a timeout may repeat an operation that already happened: payments need idempotency keys, and the buyer should not wait for the provider.
- **Setup:** `payment-system` · profile `load` · target 300 req/s · 50% reads · seed 73 · chaos `off` · scripted events: t = 60 s — payment provider 4× slower
- **Goals:** duplicate charges < 1 · error rate < 1% · p99 < 1,500 ms
- **Try:** Turn on the idempotency key on the payment edge; then move the call behind a queue and a payment worker.
- **Observe:** Duplicate charges drop to zero with the key; with the queue, buyer latency no longer depends on the provider.
- **Related:** [Case studies](../../2027.1/classes/case-studies/index.md) · [Compute & services](../../2027.1/classes/compute/index.md)

<div class="sdp" data-scenario="payment-system" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. Why can a timeout not tell "failed" from "succeeded slowly"?
    2. How does the provider use the idempotency key?
    3. How do webhooks and reconciliation close the loop?

## Search autocomplete { #search-autocomplete }

Every keystroke in the search box asks for suggestions: 10 000 req/s, all reads, and they must feel instant (< 50 ms). The search cluster cannot take it. Most prefixes are popular and repeat a lot.

- **Lesson:** Autocomplete is a latency problem: popular prefixes repeat, so a prefix cache answers most keystrokes.
- **Setup:** `search-autocomplete` · profile `load` · target 10,000 req/s · 100% reads · seed 79 · chaos `off`
- **Goals:** p99 < 50 ms · error rate < 0.1% · cost/month < US$ 5,000
- **Try:** Insert a Cache between the app and the search service; size the app tier. Lower the target RPS to simulate client debouncing.
- **Observe:** The search cluster load drops by the hit ratio and p99 meets the 50 ms budget.
- **Related:** [Case studies](../../2027.1/classes/case-studies/index.md) · [Caching](../../2027.1/classes/caching/index.md)

<div class="sdp" data-scenario="search-autocomplete" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. How many requests does debouncing at 100 ms save while typing "metallica"?
    2. Trie in memory vs. search engine: trade-offs?
    3. How often must the suggestions be rebuilt?

## AI support assistant (RAG + tools) { #ai-assistant }

The support assistant answers questions about products and orders. Its agent loop takes 6 steps (6 LLM calls + tool calls) per question, the provider quota is 10 calls/s, and nothing checks for prompt injection. 2 questions/s already exceed the quota, take seconds, and cost a fortune.

- **Lesson:** In an LLM application latency and cost scale with the number of model calls: fewer agent steps, a semantic cache and quota-aware routing matter more than raw capacity; guardrails belong in the path.
- **Setup:** `ai-assistant` · profile `load` · target 2 req/s · 100% reads · seed 83 · chaos `off`
- **Goals:** error rate < 1% · p99 < 10,000 ms · cost/month < US$ 60,000 · unsafe answers < 0.1%
- **Try:** Reduce the agent steps, turn on the semantic cache and a fallback model, and put a Safety Mesh between the gateway and the assistant.
- **Observe:** Errors (429) vanish under the quota, cost falls with the calls per question and the unsafe-answer rate drops.
- **Related:** [AI systems](../../2027.1/classes/ai-systems/index.md)

<div class="sdp" data-scenario="ai-assistant" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. Cost per question = steps × tokens × price: compute it for 6 and for 3 steps.
    2. What does a semantic cache risk (stale or wrong answers)?
    3. Where should the guardrails run: input, output, or both?

## You can't fix what you don't measure { #observability-stack }

Utilization is hidden ("?") until a service is connected to Metrics. At t = 50 s one catalog replica dies; without health checks the load balancer notices only after 30 s, and without alerting nobody repairs it quickly. Wire the observability stack: metrics on every service, health checks, alerting, logs and tracing.

- **Lesson:** Observability changes outcomes: health checks shorten detection, alerting shortens repair, and metrics make utilization visible.
- **Setup:** `observability-stack` · profile `load` · target 600 req/s · 90% reads · seed 89 · chaos `off` · scripted events: t = 50 s — a catalog replica dies
- **Goals:** availability ≥ 99% · p99 < 200 ms · services measured ≥ 100%
- **Try:** Connect Metrics to the LB, app and database; add a Health Check on the LB, Alerting on Metrics, plus Logs and Tracing on the app.
- **Observe:** The "?" become numbers; the crash at t = 50 s costs seconds instead of half a minute; the Trace tab shows where a slow request spends its time.
- **Related:** [Observability](../../2027.1/classes/observability/index.md)

<div class="sdp" data-scenario="observability-stack" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. Availability = MTTF / (MTTF + MTTR): which part did each node improve?
    2. Which four golden signals would you put on the dashboard?
    3. Why alert on SLO burn rate instead of CPU?

## Microservices on Kubernetes: pods vs nodes { #microservices }

The app was split into catalog, inventory, order and notify microservices, each with its own database, behind an API gateway, on a Kubernetes cluster of 2 nodes × 6 pods. At 2 000 req/s the catalog's HPA asks for more pods than the cluster can schedule: they stay Pending, and the catalog drowns. Buying is a synchronous chain (order → inventory, catalog, notify, its DB): every hop adds its latency to the buyer's wait.

- **Lesson:** The HPA adds pods, but only nodes add room: pods beyond nodes × pods per node stay Pending and serve nothing. In a chain of synchronous microservices every hop adds its latency to the user's wait, so work that the user does not need to wait for belongs behind a queue.
- **Setup:** `microservices` · profile `load` · target 2,000 req/s · 80% reads · seed 2031 · chaos `off`
- **Goals:** error rate < 1% · p99 < 200 ms · cost/month < US$ 8,500
- **Try:** Select the cluster frame: pods = nodes × pods per node. Add nodes or turn on the cluster autoscaler (a node takes ~90 s, so keep some headroom), raise the catalog's minimum replicas, and put a queue between order and notify.
- **Observe:** As drawn, errors ≈ 25% and p99 ≈ 3.8 s: the catalog's HPA wants ~14 pods, but the 2 × 6 cluster is full (6 catalog + 2 order + 2 inventory + 2 notify), so 9 pods stay Pending; and the buyer also waits for notify (120 ms median, σ 0.6). The possible solution — 3 nodes with the cluster autoscaler (max 6; it adds a 4th node at ~45 s, ready at ~135 s), catalog replicas and minimum 10, and order → queue *confirmations* → notify — passes with errors ≈ 0%, p99 ≈ 60 ms and ≈ 8 000 USD/month. Read the cost lines: the API gateway's per-request price, not the nodes, dominates the bill.
- **Related:** [Compute & services](../../2027.1/classes/compute/index.md) · [Cloud-native platforms](../../2027.1/classes/cloud-native/index.md)

<div class="sdp" data-scenario="microservices" data-mode="compact" data-height="480"></div>

??? question "Questions to discuss"

    1. The catalog receives the reads (80% of 2 000 req/s) plus one call per order (400 req/s), at 250 req/s per pod. How many pods does it need at ρ = 0.6, and do they fit in 2 nodes × 6 pods?
    2. Which calls of the buying chain must finish before the buyer gets an answer, and which can become events?
    3. The gateway charges 1 USD per million requests: how much is that per month at 2 000 req/s, and how would you cut it?

## Kubernetes: losing a node { #k8s-node-failure }

Catalog and pricing run 6 pods each on a cluster of 3 nodes × 4 pods: completely full. At t = 60 s a worker node dies and takes a third of the pods with it. Callers keep sending requests to the dead pods until they notice (30 s behind the load balancer, 40 s for the direct catalog → pricing call), and the lost pods have nowhere to be rescheduled. Survive the loss of any one node.

- **Lesson:** N+1 applies to nodes, not only to replicas: a lost node takes several pods at once, callers keep calling them until they notice, and Kubernetes can only reschedule them where there is room. A direct service-to-service call needs service discovery and a timeout to stop waiting for dead pods.
- **Setup:** `k8s-node-failure` · profile `load` · target 1,700 req/s · 90% reads · seed 2033 · chaos `off` · scripted events: t = 60 s — a worker node dies
- **Goals:** error rate < 1% · p99 < 150 ms · cost/month < US$ 2,000
- **Try:** Leave room in the cluster (more pods per node or one more node) and size the replicas so the survivors carry the load (ρ after losing a third below ~0.85). Put a timeout with retries on catalog → pricing, and connect a Service Registry to catalog and pricing.
- **Observe:** As drawn, the node takes 2 catalog + 2 pricing pods. Catalog → pricing calls keep going to the dead pricing pods for 40 s; each one hangs 10 s, the catalog's threads run out and the failure cascades (~90% errors in that window); after 40 s the lost pods are recreated but stay Pending (no room): ≈ 27% errors and p99 > 4 s over the run. The possible solution — 8 pods per node (3 × 8 = 24 slots: after losing a node, 16 slots for the 16 pods — N+1 for nodes), 8 replicas each, a Service Registry connected to catalog and pricing, and a 300 ms timeout + 2 retries on catalog → pricing — passes with errors ≈ 0.8% and p99 ≈ 43 ms: dead pods are dropped in 3 s, a call that lands on one gives up after 300 ms and is retried on a live pod, the surviving pods carry the load, and the 6 lost pods are all rescheduled after 40 s.
- **Related:** [Cloud-native platforms](../../2027.1/classes/cloud-native/index.md) · [Reliability](../../2027.1/classes/reliability/index.md)

<div class="sdp" data-scenario="k8s-node-failure" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. With 3 nodes × 4 pods and 12 pods, how many pods does one node failure take, and where can Kubernetes put them? And with 8 pods per node and 8 replicas each?
    2. Why does the direct catalog → pricing call hurt more than the load balancer → catalog edge? Use Little's Law with a 10 s hang.
    3. Why should the pods of one service be spread over different nodes and zones (topology spread constraints)?

## Database failover: RTO and RPO { #db-failover }

Flash-sale checkout: 1 500 req/s, half of them writes (orders), on a DB Cluster with one primary and one follower replicated asynchronously. At t = 90 s the primary dies. Until a follower is promoted (30 s) every write fails, and the writes still inside the replication lag are lost for good: orders paid and forgotten. Make the failover lose nothing and hurt little.

- **Lesson:** A failover has two costs: the time without a primary (RTO) and the writes not yet replicated (RPO). Synchronous or quorum replication makes the RPO zero at the price of a round trip per write; a fast failover and more shards shrink the RTO and the share of writes it hits — and every copy is paid.
- **Setup:** `db-failover` · profile `load` · target 1,500 req/s · 50% reads · seed 2035 · chaos `off` · scripted events: t = 90 s — the primary of orders-db dies
- **Goals:** lost writes < 1 · availability ≥ 99% · p99 (writes) < 100 ms
- **Try:** Switch the replication to sync or quorum, shorten the failover time and split the keys into shards. Then inject a latency degradation on the cluster (it slows one follower) and compare sync and quorum on the write p99.
- **Observe:** As drawn, ≈ 1 570 writes are lost when the primary dies, writes fail for 30 s (availability ≈ 90.6%), and after the promotion a single node carries reads and writes, so the write p99 reaches ≈ 375 ms. The possible solution — 2 shards, 2 followers each, quorum, failover 5 s — passes with 0 lost writes, availability ≈ 99.2% and a write p99 ≈ 34 ms; but the database bill goes from 900 to 2 700 USD/month (2 shards × 3 nodes × 450).
- **Related:** [Databases](../../2027.1/classes/databases/index.md) · [Reliability](../../2027.1/classes/reliability/index.md)

<div class="sdp" data-scenario="db-failover" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. Lost writes ≈ write rate × lag: estimate them from the inspector just before t = 90 s.
    2. With one follower slowed down, why does sync suffer and quorum with 2 followers not?
    3. RPO 0 and RTO 5 s triple the database bill: for which data is it worth it (orders, sessions, analytics)?

## More case studies { #more-case-studies }

Two case studies of the course that have no generic scenario above, then classic interview problems, each reduced to the one idea it is known for.

## Ticketing: 2 M fans, 60 k seats { #ticketing }

The case study: 2 million fans arrive in 120 s for 60 000 seats. Each fan joins (≈ 17 000 joins/s) and then polls its position every 10 s (≈ 200 000 polls/s); the payment provider takes 2 s. With no line, ≈ 200 000 req/s hit 40 sale servers and one inventory database. Keep the hold p99 under 300 ms.

- **Lesson:** A ticket sale is a line problem: answer the polls from the edge, put the joins in a waiting room and admit shoppers at the rate the inventory and the payment provider can take.
- **Setup:** `ticketing` · profile `load` · target 217,000 req/s · 92% reads · seed 2015 · chaos `off`
- **Goals:** error rate < 1% · p99 < 300 ms
- **Try:** Run it, then build the solution in two steps: a CDN for the polls (filter read to a status service) and a waiting room for the joins (filter write) drained by shopper workers.
- **Observe:** As drawn, ≈ 99% of the requests fail and the inventory database is the bottleneck. With the CDN (98% hits on 1 KB polls) and the waiting room, nothing fails and p99 is ≈ 40 ms; ≈ 33 shoppers/s reach the database and ≈ 70 payment calls are in flight. The cost tile extrapolates the peak to a whole month, so it is far above what a 2-minute sale costs.
- **Related:** [Case study: ticketing](../../2027.1/classes/case-studies/ticketing/index.md) · [Messaging](../../2027.1/classes/messaging/index.md) · [Traffic & edge](../../2027.1/classes/edge/index.md)

<div class="sdp" data-scenario="ticketing" data-mode="compact" data-height="480"></div>

??? question "Questions to discuss"

    1. Derive the admission rate from 10 000 active shoppers and 300 s per shopper.
    2. How long does the last of the 2 M fans wait, and what should the page tell those beyond the 60 000 seats?
    3. What stops bots from joining the line many times?

## Distributed cache: memory or throughput? { #distributed-cache }

The case study: 1 billion items of 1 KB, 2 million reads/s, 95% hits. 1.1 TB fits in 17 nodes of 64 GB — but one node serves 80 000 ops/s, so 17 nodes give 1.36 M ops/s. Behind the cache, the database takes the misses: 100 000 req/s at 95%, twice that at 90%. Serve 2 M reads/s with p99 under 10 ms.

- **Lesson:** A cache cluster is sized by the larger of memory and throughput, with headroom and copies; its hit ratio sizes the database behind it.
- **Setup:** `distributed-cache` · profile `load` · target 2,000,000 req/s · 100% reads · seed 2016 · chaos `off`
- **Goals:** error rate < 0.5% · p99 < 10 ms
- **Try:** Run it with 17 nodes (sized by memory), then raise the nodes. Finally lower the hit ratio to 0.90 and watch the database.
- **Observe:** As drawn, the cache runs at ρ ≈ 1.5: ≈ 32% errors and p99 ≈ 580 ms. With 50 nodes nothing fails, p99 is ≈ 5 ms and the database takes ≈ 100 000 req/s (the 5% misses).
- **Related:** [Case study: distributed cache](../../2027.1/classes/case-studies/distributed-cache/index.md) · [Caching](../../2027.1/classes/caching/index.md)

<div class="sdp" data-scenario="distributed-cache" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. How many nodes are needed by memory and by throughput, and why does the case end with 50?
    2. Losing 1 of 25 nodes adds ≈ 80 000 misses/s: can the database take them?
    3. Why does consistent hashing matter when a node is added or lost?

## File sync: keep the bytes off your servers { #file-sync }

Desktop clients sync folders: 1 000 req/s, 80% ask "what changed?" (a metadata read), 20% upload a 4 MB block. Today every block streams through the sync API on its way to object storage: each upload holds an API thread for ≈ 400 ms, and the metadata checks wait behind them. Let clients send the bytes straight to storage.

- **Lesson:** Moving bytes is not an API's job: pre-signed URLs let clients upload blocks straight to object storage, and the API is left with small, fast metadata requests.
- **Setup:** `file-sync` · profile `load` · target 1,000 req/s · 80% reads · seed 101 · chaos `off`
- **Goals:** p99 < 150 ms · error rate < 0.5%
- **Try:** Run it and read the bottleneck (sync API, threads). Connect the client to the Object Store with filter write, remove the API → blocks edge and lower the API latency to ≈ 10 ms.
- **Observe:** As drawn, the API runs out of threads (ρ ≈ 1.9): ≈ 57% of the requests fail and p99 reaches seconds, metadata reads included. With direct uploads the API sits at ρ ≈ 0.5 and p99 is ≈ 85 ms.
- **Related:** [Case studies](../../2027.1/classes/case-studies/index.md) · [Compute & services](../../2027.1/classes/compute/index.md) · [Estimation](../../2027.1/classes/estimation/index.md)

<div class="sdp" data-scenario="file-sync" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. Use Little's Law: how many API threads do 200 uploads/s of 400 ms keep busy?
    2. Why split files into 4 MB blocks, and how do content hashes of the blocks save uploads (deduplication)?
    3. How does a client learn that another device changed a file without polling the metadata every second?

## Proximity search: businesses near me { #proximity-search }

"Restaurants within 2 km": 5 000 req/s, 99% reads, a few new reviews and businesses. The query scans a latitude/longitude range in PostgreSQL (60 ms, even with two read replicas). Most searches come from the same busy neighbourhoods. Give the read path a geospatial index and cache the popular cells.

- **Lesson:** A proximity query becomes a lookup of a few cells of a geospatial index (geohash, quadtree); popular cells repeat, so a cache in front takes most of the reads, and the relational database keeps only the writes.
- **Setup:** `proximity-search` · profile `load` · target 5,000 req/s · 99% reads · seed 103 · chaos `off`
- **Goals:** p99 < 120 ms · error rate < 0.5% · cost/month < US$ 6,000
- **Try:** Send reads to a Cache in front of a Search node (filter read) and keep writes on SQL (filter write). Then lower the hit ratio and watch the index.
- **Observe:** As drawn, the database runs at ρ ≈ 1.5: ≈ 28% errors and p99 ≈ 650 ms. With the cell cache (80% hits), the geo index takes ≈ 1 000 req/s at ρ ≈ 0.4 and p99 is ≈ 80 ms.
- **Related:** [Case studies](../../2027.1/classes/case-studies/index.md) · [Databases](../../2027.1/classes/databases/index.md) · [Caching](../../2027.1/classes/caching/index.md)

<div class="sdp" data-scenario="proximity-search" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. Why is a range on latitude AND longitude slow with two ordinary B-tree indexes?
    2. A search near the edge of a geohash cell: which cells must you read?
    3. A dense city and an empty desert in the same grid: how does a quadtree adapt the cell size?

## Online judge: the contest starts { #code-judge }

Coders read problems and submit solutions: 400 req/s, 90% reads. Each submission runs in a sandbox for ≈ 2 s, and the API waits for the verdict. At t = 60 s a contest starts and traffic triples for two minutes. API threads pile up behind the sandboxes and even problem pages stop loading. Accept submissions at once and judge them from a queue.

- **Lesson:** Slow, untrusted work (running user code) does not belong on the request path: the API accepts the submission, a queue holds it, and runners take it at their own pace; the queue lag is the time to a verdict.
- **Setup:** `code-judge` · profile `load` · target 400 req/s · 90% reads · seed 107 · chaos `off` · scripted events: t = 60 s — the contest starts
- **Goals:** error rate < 1% · p99 < 200 ms · consumer lag < 90 s
- **Try:** Put a Message Queue between the API and the runners (filter write), connect the runners to the database, and size them with throughput = replicas ÷ 2 s.
- **Observe:** As drawn, the runners are at ρ ≈ 4.5 during the contest, most submissions fail and p99 passes 12 s. With the queue and 160 runners nothing fails, p99 is ≈ 35 ms and the queue peaks at ≈ 4 000 submissions: the last verdict of the rush waits about a minute.
- **Related:** [Case studies](../../2027.1/classes/case-studies/index.md) · [Messaging](../../2027.1/classes/messaging/index.md) · [Compute & services](../../2027.1/classes/compute/index.md)

<div class="sdp" data-scenario="code-judge" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. How many runners keep up with 120 submissions/s of 2 s each, and why is fewer acceptable here?
    2. How does the client learn the verdict: polling, long polling, or a push channel?
    3. What isolates one user's code from another's and from the judge (containers, gVisor, limits)?

## Online auction: the last minute { #online-auction }

Watchers refresh the current price and bidders place bids: 2 000 req/s, 90% reads, all on PostgreSQL. At t = 60 s the hottest auctions enter their final minute and traffic triples (sniping). Every bid must be ordered per auction and none may be lost, but the watchers don't need to hit the database to see the price.

- **Lesson:** Separate the two paths: watchers read a cached price (it changes only when a bid wins), and bids go to a durable log partitioned by auction id, so each auction's bids are applied in order.
- **Setup:** `online-auction` · profile `load` · target 2,000 req/s · 90% reads · seed 109 · chaos `off` · scripted events: t = 60 s — final minute: sniping
- **Goals:** p99 < 150 ms · error rate < 0.5% · consumer lag < 15 s
- **Try:** Add a Cache for the reads (filter read) and Kafka → bid workers for the writes (filter write). Compare the database load during the final minute.
- **Observe:** As drawn, the database runs at ρ ≈ 2.3 in the final minute: ≈ 38% errors. With the cache and the log the database stays at ρ ≈ 0.7, p99 is ≈ 30 ms and bids are applied within ≈ 1 s.
- **Related:** [Case studies](../../2027.1/classes/case-studies/index.md) · [Messaging](../../2027.1/classes/messaging/index.md) · [Caching](../../2027.1/classes/caching/index.md)

<div class="sdp" data-scenario="online-auction" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. Two bids of the same amount arrive at the same time: which wins, and where is that decided?
    2. One auction gets most of the bids: what happens to its Kafka partition (hot key)?
    3. Should the bidder wait for the bid to be applied, or only for it to be in the log? What does each tell the user?

## Ad click aggregator: count, don't store { #ad-click-aggregator }

Every ad click redirects the user and must be counted for billing: 10 000 clicks/s, plus a few advertisers reading their dashboards (2%). Today each click is an INSERT into PostgreSQL before the redirect, and the dashboards run COUNT(*) on the same table. Make the redirect fast and aggregate the clicks in a stream.

- **Lesson:** At a high event rate, write each event once to a log and aggregate it in a stream; the store behind it receives one write per key and window, and the dashboards read counts, never the raw events.
- **Setup:** `ad-click-aggregator` · profile `load` · target 10,000 req/s · 2% reads · seed 113 · chaos `off`
- **Goals:** p99 < 50 ms · error rate < 0.1% · consumer lag < 10 s
- **Try:** Send clicks to Kafka (filter write), consume them with Analytics nodes, and write to a NoSQL counts store with edge ratio 0.01. Point the dashboard reads at the counts.
- **Observe:** As drawn, the database is saturated by writes (ρ ≈ 9): ≈ 90% of the clicks fail. With the stream nothing fails, p99 is ≈ 33 ms, the aggregators run at ρ ≈ 0.6 and the counts store receives ≈ 100 writes/s.
- **Related:** [Case studies](../../2027.1/classes/case-studies/index.md) · [Messaging](../../2027.1/classes/messaging/index.md) · [Databases](../../2027.1/classes/databases/index.md)

<div class="sdp" data-scenario="ad-click-aggregator" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. An aggregator crashes after counting but before committing its offset: what happens to the count, and how do you make it exact?
    2. Why keep the raw clicks in object storage if nobody reads them online?
    3. How would you find the top 100 ads of the last hour without keeping a counter for every ad?

## Web crawler: slow sites hold the fetchers { #web-crawler }

The crawler fetches 800 pages/s from a frontier queue and stores them. A fetch takes ≈ 150 ms, so fetchers are bound by threads, not CPU. At t = 60 s a slice of the web turns slow (4×): with no timeout, every thread waits on the slow sites and the frontier backs up. Keep the crawl moving.

- **Lesson:** An I/O-bound worker's throughput is threads ÷ time per call; when the remote side slows down, throughput falls with it. Async I/O (many concurrent fetches) and a timeout keep the crawl moving.
- **Setup:** `web-crawler` · profile `load` · target 800 req/s · 100% reads · seed 127 · chaos `off` · scripted events: t = 60 s — a slice of the web turns slow
- **Goals:** consumer lag < 20 s · error rate < 3%
- **Try:** Run it and watch the frontier's backlog after t = 60 s. Raise the fetchers' threads to 400 and put a 2 s timeout on the edge to the web.
- **Observe:** As drawn, the fetchers drop to ≈ 200 pages/s while the web is slow and the frontier reaches ≈ 40 000 URLs (lag of minutes). With 400 threads per fetcher they keep pace at ρ ≈ 0.5 and the lag stays near zero.
- **Related:** [Case studies](../../2027.1/classes/case-studies/index.md) · [Reliability](../../2027.1/classes/reliability/index.md) · [Messaging](../../2027.1/classes/messaging/index.md)

<div class="sdp" data-scenario="web-crawler" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. With 4 fetchers of 50 threads, what is the throughput at 150 ms per fetch, and at 600 ms?
    2. How do you stay polite to one site (robots.txt, one queue per host, crawl delay) without idling the fetchers?
    3. How do you avoid fetching the same page twice when many links point to it?

## Post search: index asynchronously { #post-search }

Users search posts by keyword: 4 000 req/s, 60% searches, 40% new posts. Today each new post is written to the posts store and indexed synchronously in the same request; indexing costs as much as a search, so the index cluster carries both loads. Searches may lag new posts by a few seconds.

- **Lesson:** Indexing does not need to be on the write path: the post is stored, an event goes to a log, and indexers update the index in bulk; the index then serves searches, with a cache for repeated queries.
- **Setup:** `post-search` · profile `load` · target 4,000 req/s · 60% reads · seed 131 · chaos `off`
- **Goals:** p99 < 150 ms · error rate < 0.5% · consumer lag < 5 s
- **Try:** Send writes to Kafka (filter write) and let indexer workers update the index with edge ratio 0.1. Put a Cache in front of the index for the reads (filter read).
- **Observe:** As drawn, the index runs at ρ ≈ 1.3: ≈ 22% errors and p99 ≈ 1.3 s. With the log, bulk indexing and the query cache the index is at ρ ≈ 0.4, p99 is ≈ 80 ms and new posts are searchable within a second.
- **Related:** [Case studies](../../2027.1/classes/case-studies/index.md) · [Messaging](../../2027.1/classes/messaging/index.md) · [Databases](../../2027.1/classes/databases/index.md)

<div class="sdp" data-scenario="post-search" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. Why does bulk indexing (one request per ten posts) cost the index much less than ten single requests?
    2. A user posts and searches for it immediately: how do you hide the indexing lag from them?
    3. A post is deleted: how does the delete reach the index and the query cache?

## Live comments: a million viewers polling { #live-comments }

A live video has 100 000 viewers; each asks "any new comments?" every 5 s (20 000 req/s) and 1% of the requests post a comment. Every poll runs "comments since t" on the database. The answer is the same for every viewer of the stream within a second. Take the polls off the database and push new comments out.

- **Lesson:** When every viewer asks the same question, answer it once per second at the edge (micro-cache), and push new comments through pub/sub to real-time servers instead of having the database answer every poll.
- **Setup:** `live-comments` · profile `load` · target 20,000 req/s · 99% reads · seed 137 · chaos `off`
- **Goals:** p99 < 100 ms · error rate < 0.5%
- **Try:** Put a CDN in front with a 98% hit ratio, publish new comments to Pub/Sub (filter write) for a real-time push service, and scale the API down.
- **Observe:** As drawn, the database runs at ρ ≈ 1.6: ≈ 41% errors and p99 ≈ 1.4 s. With the CDN the origin sees ≈ 550 req/s and p99 is ≈ 40 ms. Check the cost: the CDN's per-request price makes the solution more expensive than the original, a real trade-off that push connections (SSE, WebSockets) avoid.
- **Related:** [Case studies](../../2027.1/classes/case-studies/index.md) · [Traffic & edge](../../2027.1/classes/edge/index.md) · [Messaging](../../2027.1/classes/messaging/index.md)

<div class="sdp" data-scenario="live-comments" data-mode="compact" data-height="420"></div>

??? question "Questions to discuss"

    1. With 100 000 viewers polling every 5 s, how many requests does a 1 s micro-cache let through per edge node?
    2. Each real-time server holds its own viewers: how does a comment reach the servers of every viewer of that stream?
    3. A stream gets 5 000 comments/s: which ones do you show, and where do you drop the rest?

## AI systems { #ai-systems }

These are architecture exercises. Start with the incomplete canvas, identify responsibilities, draw both request and background paths, then choose **Check architecture**. Arrows are calls whose results return to the caller. Numbers show call order when calls execute; explain conditional branches in your notes. Select an edge and choose **Call earlier** or **Call later** changes the order.

!!! note "What is graded"

    Automated checks inspect call ownership, ordering, durable boundaries and reachability after removing a component. They do not run LLMs or prove authorization, idempotency, retrieval quality, transactions or routing quality. Complete the **Design review** questions even when graph checks pass. Explain your design in the provided text area; it is saved and included in JSON exports and share links, but is not automatically graded.

The AI exercises omit performance knobs and monthly cost charts. Use the other Playground scenarios for traffic and capacity experiments. Hints and reference diagrams stay hidden until requested. The reference is one valid responsibility split, not an exact diagram to reproduce; a separate orchestrator is optional.

### 1. Meeting transcript summaries { #ai-summarizer }

Design a service that turns uploaded meeting transcripts into useful summaries. Some inputs are much longer than a model can accept, and processing may outlast the user’s connection. Show who accepts work, who coordinates processing, and where progress lives.

**Acceptance requirements**

- A user can leave after receiving an acknowledgement and return to find the result.
- Accepted transcripts and completed progress survive a processing-service restart.
- A transcript may contain 100,000 tokens; preserve its key decisions in the final summary.
- Handle bursts of uploads without tying acceptance to model latency.

<div class="sdp" data-scenario="ai-summarizer" data-mode="compact" data-height="460"></div>

??? question "Design review — not automatically graded"

    1. What must be persisted before acknowledging the request, and what does that acknowledgement promise?
    2. Walk through splitting, processing and combining a long transcript. How would you evaluate information loss?
    3. What is resumed after a crash, how are completed steps identified, and how does the user fetch progress or cancel?

??? tip "Hints"

    1. Trace the user request while the slowest dependency is unavailable. Which responsibilities must still work?
    2. Try removing the processing service from the diagram. Which state and entry paths remain?

### 2. Handbook assistant { #ai-faq }

Design an employee assistant for a large, changing company handbook. Answers should use relevant handbook passages and identify their sources. A handbook update and an employee question are different workloads: show both paths and who coordinates them.

**Acceptance requirements**

- Questions should not require sending the entire 500-page handbook to a model.
- Answers identify their evidence; missing evidence produces an explicit insufficient-information response.
- Updating the handbook must not block employees who are asking questions.
- The application remains responsible for assembling context and returning the answer.

<div class="sdp" data-scenario="ai-faq" data-mode="compact" data-height="460"></div>

??? question "Design review — not automatically graded"

    1. Walk through ingestion separately from answering: what is stored, what is derived, and when?
    2. Who receives retrieved passages and constructs the generation request? Explain the order of those calls.
    3. How would you measure retrieval recall, citation support and unanswerable-question behavior using labeled cases?

??? tip "Hints"

    1. Name the owner of the final answer. Follow every piece of evidence back to its source.
    2. Consider whether an employee query should perform the same work as a handbook update.

### 3. Live order support { #ai-order-status }

Customers ask where their orders are. Company policy changes slowly, but order status changes constantly and each customer may only see their own orders. Design how the assistant obtains current facts and handles unavailable business systems.

**Acceptance requirements**

- A reported order status comes from the current business system, not model memory.
- One customer cannot obtain another customer’s order information.
- A business-system timeout results in an honest unavailable response.
- Keep business rules owned by the application or order service.

<div class="sdp" data-scenario="ai-order-status" data-mode="compact" data-height="460"></div>

??? question "Design review — not automatically graded"

    1. Where is customer identity obtained, and who enforces order ownership?
    2. Walk through the live read, the returned facts and the final answer. Do you need an agent loop for this workflow?
    3. How do malformed arguments, a missing order and a timed-out read produce different outcomes?

??? tip "Hints"

    1. Separate facts that the model can explain from facts that must be read at request time.
    2. Consider whether a tool adapter and a business service have the same responsibilities.

### 4. Searchable document uploads { #ai-ingestion }

Customers upload 10,000 documents in five minutes. Make each accepted document searchable, with progress visible to the customer. Processing dependencies have finite quotas and processing services can restart midway through a document.

**Acceptance requirements**

- Acknowledge accepted uploads within 500 ms without promising that indexing is already finished.
- Accepted originals and processing progress survive a worker restart.
- Ninety-nine percent of accepted documents become searchable within ten minutes.
- Retried work must not create duplicate visible chunks or leave a partially updated document active.

<div class="sdp" data-scenario="ai-ingestion" data-mode="compact" data-height="460"></div>

??? question "Design review — not automatically graded"

    1. Show original storage, derived representations and the boundary between accepting and processing a document.
    2. Who performs each index write, and how does a document become visible only when ready?
    3. Define document/chunk identities, checkpoints, retry behavior and how you would prove the ten-minute target under quota limits.

??? tip "Hints"

    1. Write down what “accepted” and “searchable” mean as separate states.
    2. Trace a failure after some derived data has been written but before the job reports completion.

### 5. Company knowledge assistant { #ai-tenant-search }

One knowledge assistant serves 100 companies. Employees have different document permissions, and access can change after documents have been indexed. Companies sometimes ask identical questions. Design the answering path so employees receive current, authorized answers.

**Acceptance requirements**

- No company or employee may receive another user’s restricted evidence or answer.
- Revoking document access must affect answers within 30 seconds.
- Both newly generated and reused answers obey the current user’s access rights.
- Evidence selection and generation remain coordinated by application code.

<div class="sdp" data-scenario="ai-tenant-search" data-mode="compact" data-height="460"></div>

??? question "Design review — not automatically graded"

    1. How does identity reach every evidence access, and where is authorization enforced?
    2. What permission metadata lives in the index, where is its source of truth, and how do revocations propagate?
    3. If you reuse answers, describe cache scope, permission changes and a cross-tenant cache-hit test. Omitting answer caching is valid.

??? tip "Hints"

    1. Follow a question that is identical to one asked by an employee in another company.
    2. Draw the path taken when an answer is already available, rather than only the cache-miss path.

### 6. Long-running research reports { #ai-research }

Users request research reports that take several minutes and involve external sources. A user may disconnect, and the processing service may restart halfway through a report. Design acceptance, execution, progress and recovery.

**Acceptance requirements**

- Accepted reports remain discoverable after a disconnected request or processing restart.
- Retain completed evidence and resume unfinished work instead of silently starting over.
- Provide explicit completion, failure and cancellation states.
- Bound source fetching, model usage and total execution time.

<div class="sdp" data-scenario="ai-research" data-mode="compact" data-height="460"></div>

??? question "Design review — not automatically graded"

    1. What is the durable job identity, and what state is stored after each completed step?
    2. Which operations can safely repeat, and which require reconciliation? Explain recovery after a crash between a side effect and a checkpoint.
    3. Who decides when the report is complete, and how are missing evidence, budgets and cancellation enforced?

??? tip "Hints"

    1. An open stream is a presentation mechanism. What other state must exist for reconnection?
    2. Distinguish the workflow’s state from the data returned by its dependencies.

### 7. Customer refunds { #ai-refunds }

A support assistant can help customers request refunds. Some payment requests commit successfully but time out before returning a result, and both the assistant and execution infrastructure may retry. Design the boundary between a model’s proposal and an authorized business action.

**Acceptance requirements**

- Only an authorized, approved action may produce a refund.
- Repeating an operation must not issue another refund for the same intended action.
- A timeout must not be interpreted as proof that no payment occurred.
- Uncertain results remain visible and are reconciled or escalated.

<div class="sdp" data-scenario="ai-refunds" data-mode="compact" data-height="460"></div>

??? question "Design review — not automatically graded"

    1. Who validates the proposed amount, customer, order and approval before execution?
    2. Where is the stable operation identity created and stored? Trace a committed payment followed by a timeout and retry.
    3. What must be queried or reconciled before telling the customer that the refund succeeded or failed?

??? tip "Hints"

    1. Separate proposing an action from having the authority to execute it.
    2. Walk through the exact moment at which payment state becomes uncertain.

### 8. Ticket triage with multiple models { #ai-model-routing }

An AI service classifies incoming support tickets. Most are straightforward, some are ambiguous, and a provider may become unavailable. Design how model choice, result checking and recovery fit together while controlling cost and preserving classification quality.

**Acceptance requirements**

- Avoid making every ticket pay for the strongest model or for every available model.
- Ambiguous results can be escalated rather than accepted blindly.
- A provider outage must not make every classification path unavailable.
- Measure cost per accepted outcome and quality on the same labeled workload.

<div class="sdp" data-scenario="ai-model-routing" data-mode="compact" data-height="460"></div>

??? question "Design review — not automatically graded"

    1. What evidence determines initial model selection and escalation? Why is this more than blind load balancing?
    2. Who validates the returned classification and decides to accept, retry, escalate or stop?
    3. What happens when either provider fails? Explain independence of fallbacks, bounded retries and how you would test quality and cost.

??? tip "Hints"

    1. Draw who chooses a model separately from the model itself.
    2. Trace one easy ticket, one uncertain result and one provider outage. Should they follow identical paths?
