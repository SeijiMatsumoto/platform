# Guia de cenários

Cada cenário do [System Design Playground](../index.md) é um pequeno laboratório: uma situação realista, um projeto inicial que **falha** nas metas por um motivo e uma correção possível. Cada seção abaixo diz o que o cenário ensina, o que tentar, o que observar, as metas e perguntas para discutir em aula. Os simuladores embutidos são compactos (controles de execução, métricas e parâmetros); use **Abrir no playground** (↗) para editar a estrutura.

## Como trabalhar um cenário

1. **Preveja antes de rodar.** Estime a utilização (ρ = λ / μ) e o comportamento das filas com os números do enunciado.
2. **Rode o projeto inicial** e leia o Relatório: que meta falha e qual é o gargalo?
3. **Mude uma coisa por vez** e rode de novo com a mesma semente — as diferenças vêm da sua mudança, não da sorte.
4. **Troque a semente** no final: um bom projeto passa com qualquer semente.
5. **Explique os números** com as fórmulas do [manual](../index.md#how-the-model-works).

!!! tip "Exercício"

    O exercício avaliado *playground-design* pede que você resolva três cenários e entregue o JSON exportado mais uma justificativa curta (o Relatório tem um botão **Copiar relatório (Markdown)**).

## Todos os cenários

| Cenário | Lição |
|---|---|
| [Monólito: encontre o ponto de ruptura](#monolith) | Todo sistema tem um ponto de ruptura e o primeiro componente a saturar o define |
| [Escalar horizontalmente atrás de um balanceador](#scale-out) | Escala horizontal precisa de folga para falhas (N+1), e o balanceador só desvia de uma réplica morta depois de detectá-la |
| [Catálogo com muitas leituras: adicione um cache](#read-heavy-cache) | Um cache antes do banco reduz sua carga de leitura para leituras × (1 − taxa de acerto); um cache frio manda tudo de volta ao banco de uma vez (stampede) |
| [Tire o conteúdo estático da origem com uma CDN](#cdn-static) | Conteúdo estático e cacheável fica na borda |
| [Réplicas de leitura e atraso de replicação](#db-replicas) | Réplicas de leitura multiplicam a capacidade de leitura, não a de escrita, e servem dados um pouco antigos (atraso de replicação) |
| [Partições e a chave quente](#sharding) | Particionar escala com o número de partições só enquanto as chaves se espalham; uma chave quente concentra a carga numa partição |
| [Uma fila absorve o pico](#async-queue) | Uma fila desacopla o usuário do trabalho lento |
| [Publique um evento, deixe os consumidores reagirem](#event-fanout) | Com um log de eventos cada grupo de consumidores lê no seu ritmo |
| [Falha em cascata: uma dependência lenta](#cascading-failure) | Uma dependência lenta sem timeouts esgota as threads de quem chama (Lei de Little) e derruba requisições que nem a usam |
| [Tempestade de retries: quando retentar piora](#retry-storm) | Retries imediatos multiplicam a carga de um serviço em apuros; quando as respostas passam do timeout, toda tentativa falha e o sistema continua fora mesmo após o gatilho (falha metaestável) |
| [Rate limiting protege o backend](#rate-limiter) | Rejeitar o excesso rapidamente (429) protege o backend e os usuários reais; deixá-lo enfileirar degrada todo mundo |
| [Sobrevivendo à queda de uma região](#multi-region) | Sobreviver à perda de uma região exige uma segunda pilha completa e um jeito de mover os usuários |
| [Pico serverless: cold starts e limites](#serverless-burst) | Funções escalam por requisição |
| [Venda relâmpago: um lançamento com estoque limitado](#flash-sale) | Uma venda relâmpago é projetada para o pico |
| [Encurtador de URLs (sho.rt/xyz)](#url-shortener) | Uma busca por chave com muitas leituras |
| [Feed de notícias: fan-out na escrita vs na leitura](#news-feed) | Fan-out na escrita move trabalho do caminho de leitura (frequente) para o de escrita (raro) |
| [Chat de um evento ao vivo](#chat) | Chat separa guardar mensagens (particionado, muitas escritas) de entregá-las (pub/sub para os servidores conectados) |
| [Carona: um índice geográfico com muitas escritas](#ride-sharing) | Atualizações de posição são um fluxo de muitas escritas |
| [Streaming de vídeo: CDN + object store + transcodificação](#video-streaming) | Vídeo é bytes na borda mais trabalho pesado em segundo plano |
| [Sistema de notificações](#notification-system) | Notificações são assíncronas por natureza |
| [Pagamentos: retries precisam de idempotência](#payment-system) | Um retry após timeout pode repetir uma operação que já aconteceu |
| [Autocompletar da busca](#search-autocomplete) | Autocompletar é um problema de latência |
| [Assistente de suporte com IA (RAG + ferramentas)](#ai-assistant) | Numa aplicação com LLM, latência e custo crescem com o número de chamadas ao modelo |
| [Não se conserta o que não se mede](#observability-stack) | Observabilidade muda o resultado |
| [Microsserviços no Kubernetes: pods vs nós](#microservices) | O HPA adiciona pods, só nós trazem espaço; cada salto síncrono soma à espera do usuário |
| [Kubernetes: perdendo um nó](#k8s-node-failure) | Planeje N+1 também para nós: um nó perdido leva vários pods de uma vez e eles só voltam se houver espaço |
| [Failover do banco: RTO e RPO](#db-failover) | Um failover custa o tempo sem primário (RTO) e as escritas ainda não replicadas (RPO) |
| [Venda de ingressos: 2 M de fãs, 60 mil assentos](#ticketing) | Consultas na borda, entradas numa sala de espera, compradores admitidos a ≈ 33/s |
| [Cache distribuído: memória ou vazão?](#distributed-cache) | Dimensione um cache por memória e por vazão; a taxa de acerto dimensiona o banco |
| [Sincronização de arquivos: tire os bytes dos seus servidores](#file-sync) | Uploads grandes vão direto para o object storage com URLs pré-assinadas; a API só cuida dos metadados |
| [Busca por proximidade: estabelecimentos perto de mim](#proximity-search) | "Perto de mim" é uma busca num índice geoespacial (células geohash), com as células populares em cache |
| [Juiz online: o contest começa](#code-judge) | Trabalho lento e não confiável roda a partir de uma fila; a API responde "pendente" e o atraso da fila é a espera pelo veredito |
| [Leilão online: o último minuto](#online-auction) | Observadores leem o preço em cache; lances vão para um log ordenado particionado por leilão |
| [Agregador de cliques: conte, não armazene](#ad-click-aggregator) | Eventos em alta taxa são agregados num stream; painéis leem as contagens, não os eventos brutos |
| [Crawler: sites lentos prendem os fetchers](#web-crawler) | Workers limitados por I/O são dimensionados por threads ÷ latência; timeouts limitam o que um site lento consome |
| [Busca de posts: indexe de forma assíncrona](#post-search) | A indexação sai do caminho de escrita por um log e indexadores em lote; consultas repetidas vão para cache |
| [Comentários ao vivo: um milhão de espectadores consultando](#live-comments) | Consultas idênticas são respondidas na borda; comentários novos são empurrados via pub/sub |
| [Resumo com IA: o prompt é grande demais](#ai-summarizer) | Cada chamada exige tokens do trecho + saída reservada <= limite de contexto. Observe chamadas agregadas e a cota. |
| [Assistente FAQ: pare de enviar o manual inteiro](#ai-faq) | O recall conta seções esperadas recuperadas. A cobertura das fontes esperadas também exige evidências e penaliza responder perguntas sem resposta. Nenhuma verifica o texto gerado. |
| [Assistente de pedidos: use uma ferramenta para fatos atuais](#ai-order-status) | Só resultados válidos podem virar respostas sobre estado. Limite tentativas e informe indisponibilidade. |
| [Ingestão de documentos: o índice fica para trás](#ai-ingestion) | Use IDs estáveis para indexação idempotente e persista progresso; repetir etapa interrompida deve ser seguro. |
| [Busca empresarial: a resposta cruza o limite do tenant](#ai-tenant-search) | Isole caches por tenant, usuário e versão de permissão; limite TTL de permissões. Meça a busca separada da geração. |
| [Agente de pesquisa: sobreviva a um reinício](#ai-research) | Defina orçamentos de chamadas e buscas. Limites menores que o necessário impedem a conclusão. |
| [Agente de reembolso: o timeout que paga duas vezes](#ai-refunds) | Registre autorização da ação exata e reconcilie resultados incertos; timeout não significa ausência de pagamento. |
| [Roteamento de modelos: cumpra o orçamento sem perder qualidade](#ai-model-routing) | Ative fallback para falhas do provedor. Compare custo e qualidade; sucesso HTTP é insuficiente. |

## Monólito: encontre o ponto de ruptura { #monolith }

Versão 1 da aplicação: um servidor de aplicação e um PostgreSQL. O perfil breakpoint aumenta a carga até os erros passarem de 5% ou o p99 explodir. Onde quebra e qual componente quebra primeiro? Faça aguentar 2 000 req/s gastando no máximo 2 000 USD/mês.

- **Lição:** Todo sistema tem um ponto de ruptura e o primeiro componente a saturar o define. Escalar uma camada leva o gargalo para a próxima.
- **Configuração:** `monolith` · perfil `breakpoint` · alvo 600 req/s · 90% leituras · semente 7 · caos `off`
- **Metas:** ponto de ruptura ≥ 2.000 req/s · custo/mês < US$ 2.000
- **Tente:** Aperte ▶ e leia o Relatório: ponto de ruptura e gargalo. Coloque um Load Balancer antes da aplicação e aumente as réplicas; rode de novo.
- **Observe:** O joelho (p99 dobra) vem bem antes da ruptura. Depois de escalar a aplicação, o banco vira o gargalo.
- **Relacionado:** [O que é system design](../../2027.1/classes/intro/index.md) · [Estimativas](../../2027.1/classes/estimation/index.md)

<div class="sdp" data-scenario="monolith" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Por que a latência cresce devagar no começo e explode perto de ρ = 1?
    2. Com 6 réplicas, qual componente quebra primeiro e em que taxa? Confira com ρ = λ / μ.
    3. O que você faria em seguida se a meta fosse 5 000 req/s?

## Escalar horizontalmente atrás de um balanceador { #scale-out }

O catálogo recebe 1 500 req/s. Duas réplicas não bastam e em t = 80 s uma réplica cai. O balanceador continua mandando tráfego para ela até perceber (30 s sem health checks). Cumpra as metas com folga para uma falha (N+1).

- **Lição:** Escala horizontal precisa de folga para falhas (N+1) e o balanceador só desvia de uma réplica morta depois de detectá-la.
- **Configuração:** `scale-out` · perfil `load` · alvo 1.500 req/s · 90% leituras · semente 11 · caos `off` · eventos programados: t = 80 s — uma réplica do catálogo cai
- **Metas:** taxa de erro < 1% · p99 < 250 ms · custo/mês < US$ 1.800
- **Tente:** Aumente as réplicas até ρ ≈ 0,6. Depois adicione um Health Check ligado ao Load Balancer.
- **Observe:** Em t = 80 s uma réplica morre: os erros duram ~30 s sem health checks e ~3 s com eles. As sobreviventes absorvem a parte dela.
- **Relacionado:** [Tráfego & borda](../../2027.1/classes/edge/index.md) · [Confiabilidade](../../2027.1/classes/reliability/index.md)

<div class="sdp" data-scenario="scale-out" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Quantas réplicas são necessárias para que perder uma mantenha ρ abaixo de 0,85?
    2. Por que uma réplica caída continua recebendo requisições por um tempo?
    3. O que o tempo de detecção faz com a disponibilidade (MTTR = detectar + reparar)?

## Catálogo com muitas leituras: adicione um cache { #read-heavy-cache }

Usuários navegam pelo catálogo: 3 000 req/s, 95% leituras. A camada de aplicação aguenta; o banco não. Em t = 100 s o cache (quando houver um) é esvaziado: o banco sobrevive à avalanche de misses?

- **Lição:** Um cache antes do banco reduz sua carga de leitura para leituras × (1 − taxa de acerto); um cache frio manda tudo de volta ao banco de uma vez (stampede).
- **Configuração:** `read-heavy-cache` · perfil `load` · alvo 3.000 req/s · 95% leituras · semente 3 · caos `off` · eventos programados: t = 100 s — cache esvaziado (deploy / reinício)
- **Metas:** p99 < 100 ms · taxa de erro < 0,5% · custo/mês < US$ 3.000
- **Tente:** Insira um Cache entre a aplicação e o banco. Rode; depois ligue a coalescência e compare o que acontece em t = 100 s.
- **Observe:** A utilização do banco cai com a taxa de acerto. No flush, sem coalescência, ele satura por vários segundos.
- **Relacionado:** [Cache](../../2027.1/classes/caching/index.md)

<div class="sdp" data-scenario="read-heavy-cache" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Com 95% de leituras e 88% de acerto, qual é a carga no banco a 3 000 req/s?
    2. Por que o cache-aside reduz a taxa de acerto quando há muitas escritas?
    3. Cite duas outras formas de sobreviver a um stampede.

## Tire o conteúdo estático da origem com uma CDN { #cdn-static }

As páginas de produtos têm imagens, estilos e scripts: 3 000 req/s, 98% leituras, servidos pela aplicação a partir do object storage. Usuários longe da região esperam e a aplicação satura. Sirva-os pela borda.

- **Lição:** Conteúdo estático e cacheável fica na borda: a origem só vê misses e escritas e o usuário recebe a resposta de perto.
- **Configuração:** `cdn-static` · perfil `load` · alvo 3.000 req/s · 98% leituras · semente 5 · caos `off`
- **Metas:** p99 < 150 ms · taxa de erro < 0,5%
- **Tente:** Coloque uma CDN depois do DNS (dns → cdn → lb). Reduza as réplicas e compare latência e custo.
- **Observe:** A aplicação cai de saturada para ~35% com menos réplicas. A saída de dados da CDN vira a maior linha de custo.
- **Relacionado:** [Tráfego & borda](../../2027.1/classes/edge/index.md)

<div class="sdp" data-scenario="cdn-static" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. O que decide a taxa de acerto de uma CDN (TTL, chave de cache, conteúdo)?
    2. Por que a saída de dados (USD/GB) costuma ser a maior linha de um site de mídia?
    3. Como você invalidaria uma imagem que mudou?

## Réplicas de leitura e atraso de replicação { #db-replicas }

4 000 req/s com 10% de escritas sobrecarregam o único primário PostgreSQL. Réplicas de leitura recebem leituras, nunca escritas, e ficam atrás do primário. Mantenha o atraso abaixo de 1 s.

- **Lição:** Réplicas de leitura multiplicam a capacidade de leitura, não a de escrita, e servem dados um pouco antigos (atraso de replicação).
- **Configuração:** `db-replicas` · perfil `load` · alvo 4.000 req/s · 90% leituras · semente 13 · caos `off`
- **Metas:** p99 < 150 ms · taxa de erro < 0,5% · atraso de replicação < 1 s
- **Tente:** Adicione 2 réplicas de leitura ao banco. Depois aumente as escritas na barra para 30% e observe o primário.
- **Observe:** Leituras se espalham por 1 + réplicas; o primário fica com todas as escritas e seu atraso cresce com elas.
- **Relacionado:** [Bancos de dados](../../2027.1/classes/databases/index.md)

<div class="sdp" data-scenario="db-replicas" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Quais leituras toleram atraso e quais devem ir ao primário (read-your-writes)?
    2. Com que parcela de escritas as réplicas deixam de ajudar?
    3. O que vem depois das réplicas quando as escritas são o limite?

## Partições e a chave quente { #sharding }

Consultas e atualizações de estoque (50% escritas) a 8 000 req/s em um banco chave-valor com 2 partições. Em t = 60 s uma celebridade posta o link de um produto: uma chave recebe uma fatia enorme do tráfego por um minuto. Mais partições resolvem a média — resolvem a chave quente?

- **Lição:** Particionar escala com o número de partições só enquanto as chaves se espalham; uma chave quente concentra a carga numa partição.
- **Configuração:** `sharding` · perfil `load` · alvo 8.000 req/s · 50% leituras · semente 17 · caos `off` · eventos programados: t = 60 s — efeito celebridade: uma chave quente
- **Metas:** taxa de erro < 0,5% · p99 < 100 ms
- **Tente:** Aumente para 8 partições e rode. Depois adicione um Cache antes do NoSQL para as leituras quentes.
- **Observe:** Em t = 60 s começa o efeito celebridade: com 8 partições a mais ocupada ainda satura; o cache absorve as leituras quentes.
- **Relacionado:** [Bancos de dados](../../2027.1/classes/databases/index.md) · [Cache](../../2027.1/classes/caching/index.md)

<div class="sdp" data-scenario="sharding" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Se a chave mais quente recebe 45% do tráfego, qual é a carga da partição dela com P = 8? E com P = 64?
    2. Além do cache, como dividir uma chave quente (salting, réplicas da chave)?
    3. Por que se usa hashing consistente para posicionar as chaves?

## Uma fila absorve o pico { #async-queue }

Cada pedido gera um recibo em PDF (50 ms de trabalho). Hoje o serviço de pedidos espera por ele. O perfil spike multiplica a carga por 5 durante 30 s: os workers não acompanham e pedidos falham. Libere o usuário e faça o trabalho depois.

- **Lição:** Uma fila desacopla o usuário do trabalho lento: o produtor só espera o broker; o backlog absorve o pico e drena depois.
- **Configuração:** `async-queue` · perfil `spike` · alvo 150 req/s · 0% leituras · semente 19 · caos `off`
- **Metas:** taxa de erro < 0,1% · p99 < 100 ms · atraso do consumidor < 60 s
- **Tente:** Troque a chamada app → worker por app → Message Queue → worker. Rode o perfil spike de novo.
- **Observe:** Os erros somem; o backlog cresce durante os 30 s de pico e drena depois. Atraso = backlog ÷ taxa de drenagem.
- **Relacionado:** [Mensageria](../../2027.1/classes/messaging/index.md) · [Computação & serviços](../../2027.1/classes/compute/index.md)

<div class="sdp" data-scenario="async-queue" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Quanto tempo o backlog leva para drenar com 4 workers? Calcule antes de rodar.
    2. O que acontece se o pico nunca acaba (produtores > consumidores para sempre)?
    3. Por que o consumidor deve ser idempotente com entrega at-least-once?

## Publique um evento, deixe os consumidores reagirem { #event-fanout }

Quando um pedido é feito, a aplicação avisa o comprador, atualiza o analytics e reindexa a disponibilidade — hoje com três chamadas síncronas em sequência. Em t = 60 s o analytics fica 20× mais lento e os pedidos ficam lentos junto. Desacople o serviço de pedidos dos consumidores.

- **Lição:** Com um log de eventos cada grupo de consumidores lê no seu ritmo: um consumidor lento fica para trás sem atrasar o produtor nem os outros.
- **Configuração:** `event-fanout` · perfil `load` · alvo 400 req/s · 0% leituras · semente 23 · caos `off` · eventos programados: t = 60 s — analytics 20× mais lento
- **Metas:** p99 < 120 ms · taxa de erro < 0,1% · atraso do consumidor < 60 s
- **Tente:** Publique no Kafka (app → kafka) e deixe notification, analytics e o indexador consumirem (kafka → cada um).
- **Observe:** Quando o analytics fica lento em t = 60 s, só o atraso dele cresce; a latência dos pedidos fica estável.
- **Relacionado:** [Mensageria](../../2027.1/classes/messaging/index.md)

<div class="sdp" data-scenario="event-fanout" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. O que define o paralelismo máximo de um grupo de consumidores?
    2. Que garantias você perde em relação a chamadas síncronas (ordem, read-your-writes)?
    3. Como publicar o evento e gravar o pedido de forma atômica (outbox)?

## Falha em cascata: uma dependência lenta { #cascading-failure }

Metade das páginas do catálogo chama uma API externa de recomendações. Em t = 60 s ela fica 20× mais lenta (3 s). Sem timeouts cada requisição segura uma thread esperando; os pools de threads se esgotam e o catálogo inteiro falha — embora a CPU da aplicação esteja quase ociosa (Lei de Little: threads = λ × W).

- **Lição:** Uma dependência lenta sem timeouts esgota as threads de quem chama (Lei de Little) e derruba requisições que nem a usam.
- **Configuração:** `cascading-failure` · perfil `load` · alvo 800 req/s · 90% leituras · semente 29 · caos `off` · eventos programados: t = 60 s — API de recomendações 20× mais lenta
- **Metas:** taxa de erro < 1% · p99 < 500 ms
- **Tente:** Rode como está e leia o gargalo no Relatório. Depois defina timeout de 300 ms em app → recommendations e então fallback e circuit breaker.
- **Observe:** Sem timeout a aplicação fica sem threads com a CPU ociosa. Com o timeout só falham as chamadas de recomendação; com o fallback, ninguém.
- **Relacionado:** [Confiabilidade](../../2027.1/classes/reliability/index.md)

<div class="sdp" data-scenario="cascading-failure" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. A 800 req/s, metade chamando uma dependência de 3 s, quantas threads ficam ocupadas? (L = λ × W)
    2. Por que só o timeout não zera os erros aqui?
    3. O que um bulkhead mudaria?

## Tempestade de retries: quando retentar piora { #retry-storm }

O serviço de inventário retenta cada consulta falha 3 vezes, na hora, com timeout de 100 ms. Em t = 60 s o banco reinicia (8 s). Quando volta, recebe até 4× a carga normal, a fila enche, as respostas passam do timeout… e ele nunca se recupera, embora o gatilho já tenha passado (uma falha metaestável).

- **Lição:** Retries imediatos multiplicam a carga de um serviço em apuros; quando as respostas passam do timeout, toda tentativa falha e o sistema continua fora mesmo após o gatilho (falha metaestável).
- **Configuração:** `retry-storm` · perfil `load` · alvo 2.000 req/s · 90% leituras · semente 31 · caos `off` · eventos programados: t = 60 s — o banco reinicia
- **Metas:** taxa de erro < 15% · p99 < 300 ms
- **Tente:** Rode e observe a aresta app → db após o reinício de 8 s. Depois ligue o circuit breaker; teste também 1 retry com backoff exponencial + jitter.
- **Observe:** A taxa na aresta salta para ~4× e os erros não se recuperam. Com o breaker o banco esvazia a fila e o sistema volta.
- **Relacionado:** [Confiabilidade](../../2027.1/classes/reliability/index.md)

<div class="sdp" data-scenario="retry-storm" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Com p = 0,9 de falha por tentativa e 3 retries, qual é o multiplicador de carga?
    2. Por que um timeout maior ou uma fila menor também quebram o ciclo?
    3. O que é um orçamento de retries (retry budget)?

## Rate limiting protege o backend { #rate-limiter }

1 000 req/s de usuários reais — mais bots raspadores enviando o dobro disso. O catálogo derrete para todos. Rejeite o excesso rapidamente no gateway (429) em vez de deixá-lo enfileirar atrás dos usuários reais.

- **Lição:** Rejeitar o excesso rapidamente (429) protege o backend e os usuários reais; deixá-lo enfileirar degrada todo mundo.
- **Configuração:** `rate-limiter` · perfil `load` · alvo 1.000 req/s · 90% leituras · semente 37 · caos `off`
- **Metas:** taxa de erro < 1% · p99 < 200 ms
- **Tente:** Defina um limite no API Gateway abaixo da capacidade da aplicação (ex.: 1 500 req/s). Ou coloque um WAF na frente.
- **Observe:** Os bots são cortados primeiro (token buckets por cliente), os usuários reais mantêm latência baixa e a aplicação fica abaixo da saturação.
- **Relacionado:** [Tráfego & borda](../../2027.1/classes/edge/index.md)

<div class="sdp" data-scenario="rate-limiter" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Token bucket vs. janela deslizante: qual permite rajadas?
    2. Onde deve ficar o limite num sistema com muitas réplicas de gateway?
    3. Por que um 429 é melhor para o cliente que um timeout?

## Sobrevivendo à queda de uma região { #multi-region }

A aplicação roda em uma região de nuvem. Em t = 60 s a região inteira cai. Construa uma segunda região e deixe o DNS levar os usuários para lá. Tempo de failover = detecção + TTL do DNS: confira os dois.

- **Lição:** Sobreviver à perda de uma região exige uma segunda pilha completa e um jeito de mover os usuários: o failover por DNS leva detecção mais TTL.
- **Configuração:** `multi-region` · perfil `load` · alvo 1.000 req/s · 90% leituras · semente 41 · caos `off` · eventos programados: t = 60 s — região sa-east-1 fora do ar
- **Metas:** disponibilidade ≥ 95% · p99 < 80 ms
- **Tente:** Desenhe uma segunda VPC (outra região) com LB, aplicação e banco; conecte o DNS a ela, ligue um Health Check ao DNS e reduza o TTL.
- **Observe:** Em t = 60 s a primeira região some. Os erros duram cerca de (3 s + TTL) para os usuários roteados para lá.
- **Relacionado:** [Confiabilidade](../../2027.1/classes/reliability/index.md) · [Tráfego & borda](../../2027.1/classes/edge/index.md)

<div class="sdp" data-scenario="multi-region" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Ativo-ativo ou ativo-passivo: qual perde menos requisições aqui?
    2. O que acontece com dados gravados na região perdida (RPO)?
    3. Por que cada aplicação deve chamar o banco da própria região?

## Pico serverless: cold starts e limites { #serverless-burst }

A verificação de cupom de desconto roda como função. O perfil spike salta de 200 para 2 000 req/s. Instâncias novas partem a frio (600 ms) e a conta tem limite de concorrência de 50. Instâncias necessárias = λ × W (Lei de Little).

- **Lição:** Funções escalam por requisição: instâncias = λ × W, cold starts acontecem justo quando o tráfego salta e o limite de concorrência estrangula o resto.
- **Configuração:** `serverless-burst` · perfil `spike` · alvo 200 req/s · 90% leituras · semente 43 · caos `off`
- **Metas:** taxa de erro < 0,5% · p99 < 300 ms · custo/mês < US$ 5.000
- **Tente:** Aumente o limite de concorrência, rode o spike; depois adicione instâncias provisionadas e compare p99 e custo.
- **Observe:** O throttling (429) some com o limite maior; os cold starts aparecem no p99 no início do pico até existirem instâncias quentes.
- **Relacionado:** [Computação & serviços](../../2027.1/classes/compute/index.md)

<div class="sdp" data-scenario="serverless-burst" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Quantas instâncias 2 000 req/s × 40 ms exigem?
    2. Por que cold starts aumentam o número de instâncias necessárias?
    3. Quando um contêiner com autoescala é mais barato que funções?

## Venda relâmpago: um lançamento com estoque limitado { #flash-sale }

Um produto com estoque limitado entra à venda em t = 60 s: o tráfego salta 20× (~6 000 req/s) por 90 s. 80% das requisições leem a página do produto, 20% tentam comprar. O banco guarda o estoque (nada de vender o que não há!) e o provedor de pagamento aceita 500 req/s. Hoje tudo desaba. Projete para o pico: sirva leituras da borda e de caches e coloque os compradores numa sala de espera (fila) drenada na velocidade que o inventário e o provedor aguentam.

- **Lição:** Uma venda relâmpago é projetada para o pico: leituras são absorvidas pela borda e por caches e compradores esperam numa fila drenada no ritmo do inventário e do provedor de pagamento.
- **Configuração:** `flash-sale` · perfil `load` · alvo 300 req/s · 80% leituras · semente 2027 · caos `off` · eventos programados: t = 60 s — abre a venda
- **Metas:** p99 < 300 ms · taxa de erro < 1% · atraso do consumidor < 300 s
- **Tente:** Siga as dicas uma a uma: CDN, cache do catálogo, depois API Gateway mandando escritas para uma fila (sala de espera) consumida por workers de pedidos.
- **Observe:** Com a sala de espera os erros somem e o p99 fica baixo; o atraso do consumidor é quanto o comprador espera na fila.
- **Relacionado:** [Estudos de caso](../../2027.1/classes/case-studies/index.md) · [Mensageria](../../2027.1/classes/messaging/index.md) · [Cache](../../2027.1/classes/caching/index.md)

<div class="sdp" data-scenario="flash-sale" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Quantos itens podem ser vendidos por segundo se o pagamento aceita 500 req/s e cada pedido faz uma chamada?
    2. Como evitar vender mais itens do que há em estoque (reservas, SELECT … FOR UPDATE)?
    3. Como mostrar ao usuário sua posição na fila?

## Encurtador de URLs (sho.rt/xyz) { #url-shortener }

Cada e-mail de pedido e post compartilhado leva um link curto. 5 000 redirecionamentos/s, 99% leituras, poucas escritas (novos links). O clássico de entrevista: qual é o caminho de leitura e que banco serve para chave → URL?

- **Lição:** Uma busca por chave com muitas leituras: cache + banco chave-valor, dimensionados com aritmética simples.
- **Configuração:** `url-shortener` · perfil `load` · alvo 5.000 req/s · 99% leituras · semente 47 · caos `off`
- **Metas:** p99 < 50 ms · taxa de erro < 0,1% · custo/mês < US$ 3.500
- **Tente:** Troque o SQL por Cache → NoSQL e dimensione a aplicação.
- **Observe:** O p99 cai para poucas dezenas de ms; a maioria dos redirecionamentos nem chega ao banco.
- **Relacionado:** [Estudos de caso](../../2027.1/classes/case-studies/index.md)

<div class="sdp" data-scenario="url-shortener" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Quantos códigos cabem em 7 caracteres base-62?
    2. Como gerar códigos únicos sem coordenação?
    3. Redirecionamento 301 ou 302: qual permite contar cliques?

## Feed de notícias: fan-out na escrita vs na leitura { #news-feed }

O feed mostra posts das contas que o usuário segue. Hoje o feed é montado na leitura: uma consulta pesada (40 ms) que junta centenas de fontes. 2 000 req/s, 95% leituras. Em vez disso, pré-calcule as timelines quando algo é postado.

- **Lição:** Fan-out na escrita move trabalho do caminho de leitura (frequente) para o de escrita (raro): ler o feed vira uma busca por chave.
- **Configuração:** `news-feed` · perfil `load` · alvo 2.000 req/s · 95% leituras · semente 53 · caos `off`
- **Metas:** p99 < 100 ms · taxa de erro < 0,5% · atraso do consumidor < 10 s
- **Tente:** Mande leituras para um cache de timelines sobre um NoSQL e escritas para o banco de posts mais Kafka → workers de fan-out → timelines.
- **Observe:** Leituras ficam baratas; o atraso do fan-out mostra quanto um post leva para chegar às timelines.
- **Relacionado:** [Estudos de caso](../../2027.1/classes/case-studies/index.md) · [Mensageria](../../2027.1/classes/messaging/index.md)

<div class="sdp" data-scenario="news-feed" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. O que quebra quando uma conta tem 10 milhões de seguidores?
    2. Como uma abordagem híbrida trata celebridades?
    3. Que consistência um feed realmente precisa?

## Chat de um evento ao vivo { #chat }

Durante um evento ao vivo, usuários conversam na sala: 2 000 req/s, metade são mensagens novas. Cada mensagem é gravada no PostgreSQL e entregue de forma síncrona antes de o remetente ter resposta. As escritas sobrecarregam o banco e o remetente espera cada entrega.

- **Lição:** Chat separa guardar mensagens (particionado, muitas escritas) de entregá-las (pub/sub para os servidores conectados).
- **Configuração:** `chat` · perfil `load` · alvo 2.000 req/s · 50% leituras · semente 59 · caos `off`
- **Metas:** p99 < 80 ms · taxa de erro < 0,1% · atraso do consumidor < 2 s
- **Tente:** Guarde mensagens num NoSQL e publique-as num Pub/Sub consumido pelo serviço de entrega.
- **Observe:** A carga de escrita se espalha pelas partições; quem envia não espera mais a entrega.
- **Relacionado:** [Estudos de caso](../../2027.1/classes/case-studies/index.md) · [Tráfego & borda](../../2027.1/classes/edge/index.md)

<div class="sdp" data-scenario="chat" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Como uma mensagem chega a um usuário conectado a outro servidor websocket?
    2. Como ordenar as mensagens de uma sala?
    3. O que acontece com mensagens para usuários offline?

## Carona: um índice geográfico com muitas escritas { #ride-sharing }

Motoristas enviam a posição a cada 4 s: 20 000 req/s, 90% escritas, enquanto passageiros buscam motoristas próximos. Um banco relacional não absorve essa taxa de escrita. Guarde só a última posição por motorista num banco particionado e transmita o histórico.

- **Lição:** Atualizações de posição são um fluxo de muitas escritas: guarde só a última posição num banco particionado e mande o histórico de forma assíncrona.
- **Configuração:** `ride-sharing` · perfil `load` · alvo 20.000 req/s · 10% leituras · semente 61 · caos `off`
- **Metas:** p99 < 100 ms · taxa de erro < 0,5% · custo/mês < US$ 6.000
- **Tente:** Troque o SQL por um índice geográfico NoSQL particionado; amostre posições no Kafka para o analytics.
- **Observe:** O primário relacional saturava com as escritas; o banco particionado as absorve com folga.
- **Relacionado:** [Estudos de caso](../../2027.1/classes/case-studies/index.md) · [Bancos de dados](../../2027.1/classes/databases/index.md)

<div class="sdp" data-scenario="ride-sharing" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Quantas escritas/s geram 1 milhão de motoristas enviando a cada 4 s?
    2. Como achar motoristas num raio de 2 km (geohash, quadtree, H3)?
    3. O que acontece com o índice quando um estádio esvazia?

## Streaming de vídeo: CDN + object store + transcodificação { #video-streaming }

Criadores enviam vídeos; usuários assistem. 2 000 requisições/s de segmentos passam pela aplicação e cada upload é transcodificado de forma síncrona (20 s por vídeo) enquanto quem enviou espera. Sirva segmentos pela borda e transcodifique em segundo plano.

- **Lição:** Vídeo é bytes na borda mais trabalho pesado em segundo plano: CDN + object store para quem assiste, fila + workers para transcodificar.
- **Configuração:** `video-streaming` · perfil `load` · alvo 2.000 req/s · 99% leituras · semente 67 · caos `off`
- **Metas:** p99 < 150 ms · taxa de erro < 0,5% · atraso do consumidor < 120 s
- **Tente:** Viewers → CDN → Object Store; uploads → API Gateway → app → queue → transcoders.
- **Observe:** A aplicação quase some do caminho de quem assiste; o backlog de transcodificação drena a réplicas × 1/20 s.
- **Relacionado:** [Estudos de caso](../../2027.1/classes/case-studies/index.md) · [Tráfego & borda](../../2027.1/classes/edge/index.md)

<div class="sdp" data-scenario="video-streaming" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Por que segmentos de vídeo são ideais para cache?
    2. Quantos transcoders 0,5 upload/s de jobs de 20 s exigem (Little)?
    3. Por que gerar várias taxas de bits (streaming adaptativo)?

## Sistema de notificações { #notification-system }

Cada compra manda um e-mail de confirmação (50 req/s) e um agendador manda 6 000 e-mails de resumo a cada 2 minutos — todos no mesmo instante. O provedor de e-mail aceita 200 envios/s. Hoje compradores esperam o provedor e falham sempre que chega a rajada do resumo.

- **Lição:** Notificações são assíncronas por natureza: enfileire, dose na cota do provedor e nunca dispare jobs agendados todos juntos.
- **Configuração:** `notification-system` · perfil `load` · alvo 50 req/s · 0% leituras · semente 71 · caos `off`
- **Metas:** taxa de erro < 0,5% · p99 < 150 ms · atraso do consumidor < 120 s
- **Tente:** Coloque uma fila antes do serviço de notificações e espalhe os jobs do agendador em 60 s.
- **Observe:** Os compradores não sentem mais a rajada do resumo; a cota do provedor define a drenagem.
- **Relacionado:** [Estudos de caso](../../2027.1/classes/case-studies/index.md) · [Computação & serviços](../../2027.1/classes/compute/index.md)

<div class="sdp" data-scenario="notification-system" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Por que uma rajada agendada é um pico autoinfligido?
    2. Como dar prioridade a e-mails transacionais sobre resumos?
    3. Como evitar mandar o mesmo e-mail duas vezes?

## Pagamentos: retries precisam de idempotência { #payment-system }

Pedidos chamam o provedor de pagamento de forma síncrona com timeout de 1 s e 2 retries imediatos. Em t = 60 s o provedor fica 4× mais lento: chamadas estouram o timeout e cada retry após um timeout pode cobrar o cartão DE NOVO — o provedor recebeu a primeira tentativa. Torne os pagamentos seguros e mantenha os compradores rápidos.

- **Lição:** Um retry após timeout pode repetir uma operação que já aconteceu: pagamentos precisam de chaves de idempotência e o comprador não deve esperar o provedor.
- **Configuração:** `payment-system` · perfil `load` · alvo 300 req/s · 50% leituras · semente 73 · caos `off` · eventos programados: t = 60 s — provedor de pagamento 4× mais lento
- **Metas:** cobranças duplicadas < 1 · taxa de erro < 1% · p99 < 1.500 ms
- **Tente:** Ligue a chave de idempotência na aresta do pagamento; depois mova a chamada para trás de uma fila e de um worker de pagamento.
- **Observe:** As cobranças duplicadas zeram com a chave; com a fila, a latência do comprador não depende mais do provedor.
- **Relacionado:** [Estudos de caso](../../2027.1/classes/case-studies/index.md) · [Computação & serviços](../../2027.1/classes/compute/index.md)

<div class="sdp" data-scenario="payment-system" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Por que um timeout não distingue "falhou" de "deu certo devagar"?
    2. Como o provedor usa a chave de idempotência?
    3. Como webhooks e conciliação fecham o ciclo?

## Autocompletar da busca { #search-autocomplete }

Cada tecla na caixa de busca pede sugestões: 10 000 req/s, todas leituras, e precisam parecer instantâneas (< 50 ms). O cluster de busca não aguenta. A maioria dos prefixos é popular e se repete muito.

- **Lição:** Autocompletar é um problema de latência: prefixos populares se repetem, então um cache de prefixos responde a maioria das teclas.
- **Configuração:** `search-autocomplete` · perfil `load` · alvo 10.000 req/s · 100% leituras · semente 79 · caos `off`
- **Metas:** p99 < 50 ms · taxa de erro < 0,1% · custo/mês < US$ 5.000
- **Tente:** Insira um Cache entre a aplicação e a busca; dimensione a aplicação. Reduza o RPS-alvo para simular o debounce do cliente.
- **Observe:** A carga da busca cai pela taxa de acerto e o p99 cumpre o orçamento de 50 ms.
- **Relacionado:** [Estudos de caso](../../2027.1/classes/case-studies/index.md) · [Cache](../../2027.1/classes/caching/index.md)

<div class="sdp" data-scenario="search-autocomplete" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Quantas requisições o debounce de 100 ms economiza ao digitar "metallica"?
    2. Trie em memória vs. motor de busca: trade-offs?
    3. Com que frequência as sugestões devem ser reconstruídas?

## Assistente de suporte com IA (RAG + ferramentas) { #ai-assistant }

O assistente de suporte responde perguntas sobre produtos e pedidos. Seu laço de agente faz 6 passos (6 chamadas ao LLM + ferramentas) por pergunta, a cota do provedor é de 10 chamadas/s e nada verifica prompt injection. 2 perguntas/s já estouram a cota, levam segundos e custam uma fortuna.

- **Lição:** Numa aplicação com LLM, latência e custo crescem com o número de chamadas ao modelo: menos passos, cache semântico e roteamento ciente da cota importam mais que capacidade bruta; guardrails ficam no caminho.
- **Configuração:** `ai-assistant` · perfil `load` · alvo 2 req/s · 100% leituras · semente 83 · caos `off`
- **Metas:** taxa de erro < 1% · p99 < 10.000 ms · custo/mês < US$ 60.000 · respostas inseguras < 0,1%
- **Tente:** Reduza os passos do agente, ligue o cache semântico e um modelo reserva, e coloque um Safety Mesh entre o gateway e o assistente.
- **Observe:** Os erros (429) somem abaixo da cota, o custo cai com as chamadas por pergunta e a taxa de respostas inseguras despenca.
- **Relacionado:** [Sistemas de IA](../../2027.1/classes/ai-systems/index.md)

<div class="sdp" data-scenario="ai-assistant" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Custo por pergunta = passos × tokens × preço: calcule para 6 e para 3 passos.
    2. O que um cache semântico arrisca (respostas velhas ou erradas)?
    3. Onde os guardrails devem rodar: entrada, saída ou ambos?

## Não se conserta o que não se mede { #observability-stack }

A utilização fica oculta ("?") até o serviço ser ligado ao Metrics. Em t = 50 s uma réplica do catálogo morre; sem health checks o balanceador só percebe após 30 s e sem alertas ninguém a repara logo. Monte a pilha de observabilidade: métricas em todo serviço, health checks, alertas, logs e tracing.

- **Lição:** Observabilidade muda o resultado: health checks encurtam a detecção, alertas encurtam o reparo e métricas tornam a utilização visível.
- **Configuração:** `observability-stack` · perfil `load` · alvo 600 req/s · 90% leituras · semente 89 · caos `off` · eventos programados: t = 50 s — uma réplica do catálogo morre
- **Metas:** disponibilidade ≥ 99% · p99 < 200 ms · serviços medidos ≥ 100%
- **Tente:** Conecte Metrics ao LB, à aplicação e ao banco; adicione Health Check no LB, Alerting no Metrics, além de Logs e Tracing na aplicação.
- **Observe:** Os "?" viram números; a queda em t = 50 s custa segundos em vez de meio minuto; a aba Trace mostra onde uma requisição lenta gasta seu tempo.
- **Relacionado:** [Observabilidade](../../2027.1/classes/observability/index.md)

<div class="sdp" data-scenario="observability-stack" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Disponibilidade = MTTF / (MTTF + MTTR): que parte cada nó melhorou?
    2. Que quatro sinais de ouro você poria no painel?
    3. Por que alertar por taxa de queima do SLO e não por CPU?

## Microsserviços no Kubernetes: pods vs nós { #microservices }

A aplicação foi dividida nos microsserviços catalog, inventory, order e notify, cada um com seu banco, atrás de um API gateway, num cluster Kubernetes de 2 nós × 6 pods. Com 2 000 req/s o HPA do catálogo pede mais pods do que o cluster consegue alocar: eles ficam Pending e o catálogo afoga. Comprar é uma cadeia síncrona (order → inventory, catalog, notify, seu banco): cada salto soma sua latência à espera do comprador.

- **Lição:** O HPA adiciona pods, mas só nós trazem espaço: pods além de nós × pods por nó ficam Pending e não atendem nada. Numa cadeia de microsserviços síncronos cada salto soma sua latência à espera do usuário, então o trabalho que o usuário não precisa esperar vai para trás de uma fila.
- **Configuração:** `microservices` · perfil `load` · alvo 2.000 req/s · 80% leituras · semente 2031 · caos `off`
- **Metas:** taxa de erro < 1% · p99 < 200 ms · custo/mês < US$ 8.500
- **Tente:** Selecione a moldura do cluster: pods = nós × pods por nó. Adicione nós ou ligue o cluster autoscaler (um nó leva ~90 s, então mantenha alguma folga), aumente o mínimo de réplicas do catálogo e coloque uma fila entre order e notify.
- **Observe:** Como está, erros ≈ 25% e p99 ≈ 3,8 s: o HPA do catálogo quer ~14 pods, mas o cluster de 2 × 6 está cheio (6 catalog + 2 order + 2 inventory + 2 notify), então 9 pods ficam Pending; e o comprador ainda espera o notify (mediana de 120 ms, σ 0,6). A solução possível — 3 nós com o cluster autoscaler (máx. 6; ele adiciona um 4º nó em ~45 s, pronto em ~135 s), réplicas e mínimo do catálogo em 10, e order → fila *confirmations* → notify — passa com erros ≈ 0%, p99 ≈ 60 ms e ≈ 8 000 USD/mês. Leia as linhas de custo: o preço por requisição do API gateway, não os nós, domina a conta.
- **Relacionado:** [Computação & serviços](../../2027.1/classes/compute/index.md) · [Plataformas cloud-native](../../2027.1/classes/cloud-native/index.md)

<div class="sdp" data-scenario="microservices" data-mode="compact" data-height="480"></div>

??? question "Perguntas para discutir"

    1. O catálogo recebe as leituras (80% de 2 000 req/s) mais uma chamada por pedido (400 req/s), a 250 req/s por pod. Quantos pods ele precisa com ρ = 0,6 e eles cabem em 2 nós × 6 pods?
    2. Que chamadas da cadeia de compra precisam terminar antes de o comprador ter resposta e quais podem virar eventos?
    3. O gateway cobra 1 USD por milhão de requisições: quanto isso dá por mês a 2 000 req/s e como você o reduziria?

## Kubernetes: perdendo um nó { #k8s-node-failure }

Catalog e pricing rodam 6 pods cada num cluster de 3 nós × 4 pods: completamente cheio. Em t = 60 s um nó morre e leva um terço dos pods. Quem chama continua mandando requisições aos pods mortos até perceber (30 s atrás do balanceador, 40 s na chamada direta catalog → pricing) e os pods perdidos não têm onde ser realocados. Sobreviva à perda de qualquer nó.

- **Lição:** N+1 vale para nós, não só para réplicas: um nó perdido leva vários pods de uma vez, quem chama continua chamando-os até perceber e o Kubernetes só consegue realocá-los onde houver espaço. Uma chamada direta entre serviços precisa de descoberta de serviços e de timeout para parar de esperar por pods mortos.
- **Configuração:** `k8s-node-failure` · perfil `load` · alvo 1.700 req/s · 90% leituras · semente 2033 · caos `off` · eventos programados: t = 60 s — um nó de trabalho morre
- **Metas:** taxa de erro < 1% · p99 < 150 ms · custo/mês < US$ 2.000
- **Tente:** Deixe espaço no cluster (mais pods por nó ou um nó a mais) e dimensione as réplicas para que as sobreviventes aguentem a carga (ρ após perder um terço abaixo de ~0,85). Coloque timeout com retries em catalog → pricing e conecte um Service Registry a catalog e pricing.
- **Observe:** Como está, o nó leva 2 pods do catalog + 2 do pricing. As chamadas catalog → pricing continuam indo aos pods mortos do pricing por 40 s; cada uma trava 10 s, as threads do catálogo acabam e a falha cascateia (~90% de erros nessa janela); após 40 s os pods perdidos são recriados mas ficam Pending (sem espaço): ≈ 27% de erros e p99 > 4 s na execução. A solução possível — 8 pods por nó (3 × 8 = 24 vagas: após perder um nó, 16 vagas para os 16 pods — N+1 para nós), 8 réplicas cada, um Service Registry conectado a catalog e pricing, e timeout de 300 ms + 2 retries em catalog → pricing — passa com erros ≈ 0,8% e p99 ≈ 43 ms: pods mortos são descartados em 3 s, uma chamada que cai num deles desiste após 300 ms e é retentada num pod vivo, os pods sobreviventes aguentam a carga e os 6 pods perdidos são todos realocados após 40 s.
- **Relacionado:** [Plataformas cloud-native](../../2027.1/classes/cloud-native/index.md) · [Confiabilidade](../../2027.1/classes/reliability/index.md)

<div class="sdp" data-scenario="k8s-node-failure" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Com 3 nós × 4 pods e 12 pods, quantos pods uma falha de nó leva e onde o Kubernetes pode colocá-los? E com 8 pods por nó e 8 réplicas cada?
    2. Por que a chamada direta catalog → pricing machuca mais que a aresta balanceador → catalog? Use a Lei de Little com uma trava de 10 s.
    3. Por que os pods de um serviço devem se espalhar por nós e zonas diferentes (topology spread constraints)?

## Failover do banco: RTO e RPO { #db-failover }

Checkout da venda relâmpago: 1 500 req/s, metade escritas (pedidos), num DB Cluster com um primário e um seguidor replicado de forma assíncrona. Em t = 90 s o primário morre. Até um seguidor ser promovido (30 s) toda escrita falha e as escritas ainda dentro do atraso de replicação se perdem de vez: pedidos pagos e esquecidos. Faça o failover não perder nada e doer pouco.

- **Lição:** Um failover tem dois custos: o tempo sem primário (RTO) e as escritas ainda não replicadas (RPO). Replicação síncrona ou por quorum zera o RPO ao preço de uma ida e volta por escrita; um failover rápido e mais shards reduzem o RTO e a parcela de escritas que ele atinge — e toda cópia é paga.
- **Configuração:** `db-failover` · perfil `load` · alvo 1.500 req/s · 50% leituras · semente 2035 · caos `off` · eventos programados: t = 90 s — o primário de orders-db morre
- **Metas:** escritas perdidas < 1 · disponibilidade ≥ 99% · p99 (escritas) < 100 ms
- **Tente:** Troque a replicação para sync ou quorum, reduza o tempo de failover e divida as chaves em shards. Depois injete uma degradação de latência no cluster (ela deixa um seguidor lento) e compare sync e quorum no p99 de escrita.
- **Observe:** Como está, ≈ 1 570 escritas se perdem quando o primário morre, as escritas falham por 30 s (disponibilidade ≈ 90,6%) e após a promoção um único nó carrega leituras e escritas, então o p99 de escrita chega a ≈ 375 ms. A solução possível — 2 shards, 2 seguidores cada, quorum, failover de 5 s — passa com 0 escritas perdidas, disponibilidade ≈ 99,2% e p99 de escrita ≈ 34 ms; mas a conta do banco vai de 900 para 2 700 USD/mês (2 shards × 3 nós × 450).
- **Relacionado:** [Bancos de dados](../../2027.1/classes/databases/index.md) · [Confiabilidade](../../2027.1/classes/reliability/index.md)

<div class="sdp" data-scenario="db-failover" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Escritas perdidas ≈ taxa de escrita × atraso: estime-as pelo inspetor logo antes de t = 90 s.
    2. Com um seguidor lento, por que o sync sofre e o quorum com 2 seguidores não?
    3. RPO 0 e RTO de 5 s triplicam a conta do banco: para que dados vale a pena (pedidos, sessões, analytics)?

## Mais estudos de caso { #more-case-studies }

Dois estudos de caso do curso que não têm um cenário genérico acima e, depois, problemas clássicos de entrevista, cada um reduzido à ideia pela qual é conhecido.

## Venda de ingressos: 2 M de fãs, 60 mil assentos { #ticketing }

O estudo de caso: 2 milhões de fãs chegam em 120 s para 60 000 assentos. Cada fã entra na fila (≈ 17 000 entradas/s) e depois consulta sua posição a cada 10 s (≈ 200 000 consultas/s); o provedor de pagamento leva 2 s. Sem fila, ≈ 200 000 req/s atingem 40 servidores de venda e um banco de inventário. Mantenha o p99 da reserva abaixo de 300 ms.

- **Lição:** Uma venda de ingressos é um problema de fila: responda as consultas de posição pela borda, coloque as entradas numa sala de espera e admita compradores na taxa que o inventário e o provedor de pagamento aguentam.
- **Configuração:** `ticketing` · perfil `load` · alvo 217.000 req/s · 92% leituras · semente 2015 · caos `off`
- **Metas:** taxa de erro < 1% · p99 < 300 ms
- **Tente:** Rode e depois construa a solução em dois passos: uma CDN para as consultas (filtro read para um serviço de status) e uma sala de espera para as entradas (filtro write) drenada por workers de compradores.
- **Observe:** Como está, ≈ 99% das requisições falham e o banco de inventário é o gargalo. Com a CDN (98% de acertos em consultas de 1 KB) e a sala de espera, nada falha e o p99 fica em ≈ 40 ms; ≈ 33 compradores/s chegam ao banco e ≈ 70 chamadas de pagamento ficam em andamento. O custo extrapola o pico para um mês inteiro, então fica bem acima do que custa uma venda de 2 minutos.
- **Relacionado:** [Estudo de caso: venda de ingressos](../../2027.1/classes/case-studies/ticketing/index.md) · [Mensageria](../../2027.1/classes/messaging/index.md) · [Tráfego & borda](../../2027.1/classes/edge/index.md)

<div class="sdp" data-scenario="ticketing" data-mode="compact" data-height="480"></div>

??? question "Perguntas para discutir"

    1. Deduza a taxa de admissão a partir de 10 000 compradores ativos e 300 s por comprador.
    2. Quanto tempo espera o último dos 2 M de fãs e o que a página deveria dizer a quem está além dos 60 000 assentos?
    3. O que impede bots de entrar na fila muitas vezes?

## Cache distribuído: memória ou vazão? { #distributed-cache }

O estudo de caso: 1 bilhão de itens de 1 KB, 2 milhões de leituras/s, 95% de acertos. 1,1 TB cabe em 17 nós de 64 GB — mas um nó atende 80 000 ops/s, então 17 nós dão 1,36 M ops/s. Atrás do cache, o banco recebe os misses: 100 000 req/s a 95%, o dobro a 90%. Atenda 2 M leituras/s com p99 abaixo de 10 ms.

- **Lição:** Um cluster de cache é dimensionado pelo maior entre memória e vazão, com folga e cópias; sua taxa de acerto dimensiona o banco atrás dele.
- **Configuração:** `distributed-cache` · perfil `load` · alvo 2.000.000 req/s · 100% leituras · semente 2016 · caos `off`
- **Metas:** taxa de erro < 0,5% · p99 < 10 ms
- **Tente:** Rode com 17 nós (dimensionado por memória) e depois aumente os nós. Por fim reduza a taxa de acerto para 0,90 e observe o banco.
- **Observe:** Como está, o cache roda a ρ ≈ 1,5: ≈ 32% de erros e p99 ≈ 580 ms. Com 50 nós nada falha, o p99 fica em ≈ 5 ms e o banco recebe ≈ 100 000 req/s (os 5% de misses).
- **Relacionado:** [Estudo de caso: cache distribuído](../../2027.1/classes/case-studies/distributed-cache/index.md) · [Cache](../../2027.1/classes/caching/index.md)

<div class="sdp" data-scenario="distributed-cache" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Quantos nós são necessários por memória e por vazão e por que o caso termina com 50?
    2. Perder 1 de 25 nós acrescenta ≈ 80 000 misses/s: o banco aguenta?
    3. Por que o hashing consistente importa quando um nó entra ou sai?

## Sincronização de arquivos: tire os bytes dos seus servidores { #file-sync }

Clientes desktop sincronizam pastas: 1 000 req/s, 80% perguntam "o que mudou?" (uma leitura de metadados), 20% enviam um bloco de 4 MB. Hoje cada bloco passa pela API de sincronização a caminho do object storage: cada upload prende uma thread da API por ≈ 400 ms, e as consultas de metadados esperam atrás deles. Deixe os clientes mandarem os bytes direto para o storage.

- **Lição:** Mover bytes não é trabalho da API: URLs pré-assinadas deixam os clientes enviarem os blocos direto ao object storage, e a API fica com requisições de metadados pequenas e rápidas.
- **Configuração:** `file-sync` · perfil `load` · alvo 1.000 req/s · 80% leituras · semente 101 · caos `off`
- **Metas:** p99 < 150 ms · taxa de erro < 0,5%
- **Tente:** Rode e leia o gargalo (API de sincronização, threads). Conecte o cliente ao Object Store com filtro write, remova a aresta API → blocos e reduza a latência da API para ≈ 10 ms.
- **Observe:** Como está, a API fica sem threads (ρ ≈ 1,9): ≈ 57% das requisições falham e o p99 chega a segundos, inclusive nas leituras de metadados. Com uploads diretos a API fica em ρ ≈ 0,5 e o p99 em ≈ 85 ms.
- **Relacionado:** [Estudos de caso](../../2027.1/classes/case-studies/index.md) · [Computação & serviços](../../2027.1/classes/compute/index.md) · [Estimativas](../../2027.1/classes/estimation/index.md)

<div class="sdp" data-scenario="file-sync" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Use a Lei de Little: quantas threads da API 200 uploads/s de 400 ms mantêm ocupadas?
    2. Por que dividir arquivos em blocos de 4 MB, e como hashes do conteúdo dos blocos economizam uploads (deduplicação)?
    3. Como um cliente descobre que outro dispositivo mudou um arquivo sem consultar os metadados a cada segundo?

## Busca por proximidade: estabelecimentos perto de mim { #proximity-search }

"Restaurantes num raio de 2 km": 5 000 req/s, 99% leituras, poucas avaliações e estabelecimentos novos. A consulta varre uma faixa de latitude/longitude no PostgreSQL (60 ms, mesmo com duas réplicas de leitura). A maioria das buscas vem dos mesmos bairros movimentados. Dê ao caminho de leitura um índice geoespacial e faça cache das células populares.

- **Lição:** Uma consulta de proximidade vira a busca de algumas células de um índice geoespacial (geohash, quadtree); células populares se repetem, então um cache na frente absorve a maior parte das leituras, e o banco relacional fica só com as escritas.
- **Configuração:** `proximity-search` · perfil `load` · alvo 5.000 req/s · 99% leituras · semente 103 · caos `off`
- **Metas:** p99 < 120 ms · taxa de erro < 0,5% · custo/mês < US$ 6.000
- **Tente:** Mande as leituras para um Cache na frente de um nó Search (filtro read) e mantenha as escritas no SQL (filtro write). Depois reduza a taxa de acerto e observe o índice.
- **Observe:** Como está, o banco roda a ρ ≈ 1,5: ≈ 28% de erros e p99 ≈ 650 ms. Com o cache de células (80% de acertos), o índice geográfico recebe ≈ 1 000 req/s a ρ ≈ 0,4 e o p99 fica em ≈ 80 ms.
- **Relacionado:** [Estudos de caso](../../2027.1/classes/case-studies/index.md) · [Bancos de dados](../../2027.1/classes/databases/index.md) · [Cache](../../2027.1/classes/caching/index.md)

<div class="sdp" data-scenario="proximity-search" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Por que uma faixa de latitude E longitude é lenta com dois índices B-tree comuns?
    2. Uma busca perto da borda de uma célula geohash: quais células você precisa ler?
    3. Uma cidade densa e um deserto vazio na mesma grade: como uma quadtree adapta o tamanho da célula?

## Juiz online: o contest começa { #code-judge }

Programadores leem problemas e enviam soluções: 400 req/s, 90% leituras. Cada submissão roda num sandbox por ≈ 2 s, e a API espera o veredito. Em t = 60 s começa um contest e o tráfego triplica por dois minutos. As threads da API se acumulam atrás dos sandboxes e até as páginas dos problemas param de carregar. Aceite as submissões na hora e julgue-as a partir de uma fila.

- **Lição:** Trabalho lento e não confiável (rodar código do usuário) não pertence ao caminho da requisição: a API aceita a submissão, uma fila a guarda e os runners a consomem no seu ritmo; o atraso da fila é o tempo até o veredito.
- **Configuração:** `code-judge` · perfil `load` · alvo 400 req/s · 90% leituras · semente 107 · caos `off` · eventos programados: t = 60 s — o contest começa
- **Metas:** taxa de erro < 1% · p99 < 200 ms · atraso do consumidor < 90 s
- **Tente:** Coloque uma Message Queue entre a API e os runners (filtro write), conecte os runners ao banco e dimensione-os com vazão = réplicas ÷ 2 s.
- **Observe:** Como está, os runners ficam a ρ ≈ 4,5 durante o contest, a maioria das submissões falha e o p99 passa de 12 s. Com a fila e 160 runners nada falha, o p99 fica em ≈ 35 ms e a fila chega a ≈ 4 000 submissões: o último veredito da rajada espera cerca de um minuto.
- **Relacionado:** [Estudos de caso](../../2027.1/classes/case-studies/index.md) · [Mensageria](../../2027.1/classes/messaging/index.md) · [Computação & serviços](../../2027.1/classes/compute/index.md)

<div class="sdp" data-scenario="code-judge" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Quantos runners acompanham 120 submissões/s de 2 s cada, e por que menos é aceitável aqui?
    2. Como o cliente descobre o veredito: polling, long polling ou um canal de push?
    3. O que isola o código de um usuário do de outro e do próprio juiz (contêineres, gVisor, limites)?

## Leilão online: o último minuto { #online-auction }

Observadores atualizam o preço atual e licitantes dão lances: 2 000 req/s, 90% leituras, tudo no PostgreSQL. Em t = 60 s os leilões mais disputados entram no último minuto e o tráfego triplica (sniping). Todo lance precisa ser ordenado por leilão e nenhum pode se perder, mas os observadores não precisam ir ao banco para ver o preço.

- **Lição:** Separe os dois caminhos: observadores leem um preço em cache (ele só muda quando um lance vence), e lances vão para um log durável particionado pelo id do leilão, para que os lances de cada leilão sejam aplicados em ordem.
- **Configuração:** `online-auction` · perfil `load` · alvo 2.000 req/s · 90% leituras · semente 109 · caos `off` · eventos programados: t = 60 s — último minuto: sniping
- **Metas:** p99 < 150 ms · taxa de erro < 0,5% · atraso do consumidor < 15 s
- **Tente:** Adicione um Cache para as leituras (filtro read) e Kafka → workers de lances para as escritas (filtro write). Compare a carga do banco no último minuto.
- **Observe:** Como está, o banco roda a ρ ≈ 2,3 no último minuto: ≈ 38% de erros. Com o cache e o log o banco fica em ρ ≈ 0,7, o p99 em ≈ 30 ms e os lances são aplicados em ≈ 1 s.
- **Relacionado:** [Estudos de caso](../../2027.1/classes/case-studies/index.md) · [Mensageria](../../2027.1/classes/messaging/index.md) · [Cache](../../2027.1/classes/caching/index.md)

<div class="sdp" data-scenario="online-auction" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Dois lances de mesmo valor chegam ao mesmo tempo: qual vence, e onde isso é decidido?
    2. Um leilão recebe a maioria dos lances: o que acontece com a sua partição do Kafka (chave quente)?
    3. O licitante deve esperar o lance ser aplicado, ou só estar no log? O que cada opção diz ao usuário?

## Agregador de cliques: conte, não armazene { #ad-click-aggregator }

Cada clique num anúncio redireciona o usuário e precisa ser contado para cobrança: 10 000 cliques/s, mais alguns anunciantes lendo seus painéis (2%). Hoje cada clique é um INSERT no PostgreSQL antes do redirecionamento, e os painéis rodam COUNT(*) na mesma tabela. Deixe o redirecionamento rápido e agregue os cliques num stream.

- **Lição:** Com uma taxa alta de eventos, grave cada evento uma vez num log e agregue-o num stream; o banco atrás recebe uma escrita por chave e janela, e os painéis leem contagens, nunca os eventos brutos.
- **Configuração:** `ad-click-aggregator` · perfil `load` · alvo 10.000 req/s · 2% leituras · semente 113 · caos `off`
- **Metas:** p99 < 50 ms · taxa de erro < 0,1% · atraso do consumidor < 10 s
- **Tente:** Mande os cliques para o Kafka (filtro write), consuma-os com nós Analytics e grave num banco NoSQL de contagens com razão de aresta 0,01. Aponte as leituras dos painéis para as contagens.
- **Observe:** Como está, o banco fica saturado por escritas (ρ ≈ 9): ≈ 90% dos cliques falham. Com o stream nada falha, o p99 fica em ≈ 33 ms, os agregadores rodam a ρ ≈ 0,6 e o banco de contagens recebe ≈ 100 escritas/s.
- **Relacionado:** [Estudos de caso](../../2027.1/classes/case-studies/index.md) · [Mensageria](../../2027.1/classes/messaging/index.md) · [Bancos de dados](../../2027.1/classes/databases/index.md)

<div class="sdp" data-scenario="ad-click-aggregator" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Um agregador cai depois de contar mas antes de confirmar o offset: o que acontece com a contagem, e como torná-la exata?
    2. Por que guardar os cliques brutos no object storage se ninguém os lê online?
    3. Como achar os 100 anúncios mais clicados da última hora sem manter um contador para cada anúncio?

## Crawler: sites lentos prendem os fetchers { #web-crawler }

O crawler busca 800 páginas/s de uma fila de fronteira e as armazena. Uma busca leva ≈ 150 ms, então os fetchers são limitados por threads, não por CPU. Em t = 60 s uma parte da web fica lenta (4×): sem timeout, toda thread espera os sites lentos e a fronteira acumula. Mantenha o crawl andando.

- **Lição:** A vazão de um worker limitado por I/O é threads ÷ tempo por chamada; quando o lado remoto fica lento, a vazão cai junto. I/O assíncrono (muitas buscas simultâneas) e um timeout mantêm o crawl andando.
- **Configuração:** `web-crawler` · perfil `load` · alvo 800 req/s · 100% leituras · semente 127 · caos `off` · eventos programados: t = 60 s — uma parte da web fica lenta
- **Metas:** atraso do consumidor < 20 s · taxa de erro < 3%
- **Tente:** Rode e observe o backlog da fronteira depois de t = 60 s. Aumente as threads dos fetchers para 400 e ponha um timeout de 2 s na aresta para a web.
- **Observe:** Como está, os fetchers caem para ≈ 200 páginas/s enquanto a web está lenta e a fronteira chega a ≈ 40 000 URLs (atraso de minutos). Com 400 threads por fetcher eles acompanham a ρ ≈ 0,5 e o atraso fica perto de zero.
- **Relacionado:** [Estudos de caso](../../2027.1/classes/case-studies/index.md) · [Confiabilidade](../../2027.1/classes/reliability/index.md) · [Mensageria](../../2027.1/classes/messaging/index.md)

<div class="sdp" data-scenario="web-crawler" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Com 4 fetchers de 50 threads, qual é a vazão a 150 ms por busca, e a 600 ms?
    2. Como ser educado com um site (robots.txt, uma fila por host, crawl delay) sem deixar os fetchers ociosos?
    3. Como evitar buscar a mesma página duas vezes quando muitos links apontam para ela?

## Busca de posts: indexe de forma assíncrona { #post-search }

Usuários buscam posts por palavra-chave: 4 000 req/s, 60% buscas, 40% posts novos. Hoje cada post novo é gravado no banco de posts e indexado de forma síncrona na mesma requisição; indexar custa tanto quanto buscar, então o cluster de índice carrega as duas cargas. As buscas podem ficar alguns segundos atrás dos posts novos.

- **Lição:** A indexação não precisa estar no caminho de escrita: o post é gravado, um evento vai para um log e indexadores atualizam o índice em lote; o índice então atende as buscas, com um cache para consultas repetidas.
- **Configuração:** `post-search` · perfil `load` · alvo 4.000 req/s · 60% leituras · semente 131 · caos `off`
- **Metas:** p99 < 150 ms · taxa de erro < 0,5% · atraso do consumidor < 5 s
- **Tente:** Mande as escritas para o Kafka (filtro write) e deixe workers indexadores atualizarem o índice com razão de aresta 0,1. Ponha um Cache na frente do índice para as leituras (filtro read).
- **Observe:** Como está, o índice roda a ρ ≈ 1,3: ≈ 22% de erros e p99 ≈ 1,3 s. Com o log, a indexação em lote e o cache de consultas o índice fica em ρ ≈ 0,4, o p99 em ≈ 80 ms e posts novos aparecem na busca em menos de um segundo.
- **Relacionado:** [Estudos de caso](../../2027.1/classes/case-studies/index.md) · [Mensageria](../../2027.1/classes/messaging/index.md) · [Bancos de dados](../../2027.1/classes/databases/index.md)

<div class="sdp" data-scenario="post-search" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Por que indexar em lote (uma requisição a cada dez posts) custa ao índice bem menos que dez requisições avulsas?
    2. Um usuário posta e busca o post na hora: como esconder dele o atraso da indexação?
    3. Um post é apagado: como a remoção chega ao índice e ao cache de consultas?

## Comentários ao vivo: um milhão de espectadores consultando { #live-comments }

Um vídeo ao vivo tem 100 000 espectadores; cada um pergunta "algum comentário novo?" a cada 5 s (20 000 req/s) e 1% das requisições publica um comentário. Toda consulta roda "comentários desde t" no banco. A resposta é a mesma para todos os espectadores do stream durante um segundo. Tire as consultas do banco e empurre os comentários novos.

- **Lição:** Quando todos os espectadores fazem a mesma pergunta, responda-a uma vez por segundo na borda (micro-cache), e empurre os comentários novos via pub/sub para servidores de tempo real em vez de o banco responder cada consulta.
- **Configuração:** `live-comments` · perfil `load` · alvo 20.000 req/s · 99% leituras · semente 137 · caos `off`
- **Metas:** p99 < 100 ms · taxa de erro < 0,5%
- **Tente:** Ponha uma CDN na frente com 98% de acertos, publique os comentários novos no Pub/Sub (filtro write) para um serviço de push em tempo real e reduza a API.
- **Observe:** Como está, o banco roda a ρ ≈ 1,6: ≈ 41% de erros e p99 ≈ 1,4 s. Com a CDN a origem vê ≈ 550 req/s e o p99 fica em ≈ 40 ms. Confira o custo: o preço por requisição da CDN deixa a solução mais cara que a original, um trade-off real que conexões de push (SSE, WebSockets) evitam.
- **Relacionado:** [Estudos de caso](../../2027.1/classes/case-studies/index.md) · [Tráfego & borda](../../2027.1/classes/edge/index.md) · [Mensageria](../../2027.1/classes/messaging/index.md)

<div class="sdp" data-scenario="live-comments" data-mode="compact" data-height="420"></div>

??? question "Perguntas para discutir"

    1. Com 100 000 espectadores consultando a cada 5 s, quantas requisições um micro-cache de 1 s deixa passar por nó de borda?
    2. Cada servidor de tempo real atende seus próprios espectadores: como um comentário chega aos servidores de todos os espectadores daquele stream?
    3. Um stream recebe 5 000 comentários/s: quais você mostra, e onde descarta o resto?

## Sistemas de IA { #ai-systems }

Siga esta ordem: resumo → busca → ferramentas → ingestão → permissões → recuperação → efeitos → roteamento. Cada cenário começa com um design que falha. Selecione um componente para editar controles de IA; use **Mostrar uma solução possível** para comparar arquiteturas.

!!! note "O que é medido"

    Metas de IA reproduzem fixtures sintéticos determinísticos **após o fim da execução**. Não chamam modelos nem medem qualidade real. Gráficos de carga e latência amostrada continuam no modelo fluido; tempos, preços e falhas dos fixtures são um modelo didático separado. O relatório explica a carga. Passar no fixture é evidência sobre este modelo, não garantia de produção.

### 1. Resumo com IA: o prompt é grande demais { #ai-summarizer }

Resuma transcrições a 20 req/s: 90% têm 3.000 tokens, 10% têm 100.000. O modelo aceita 16.000 tokens, incluindo a saída. Hoje cada transcrição vira uma chamada síncrona. Preserve as vinte decisões rotuladas, reserve espaço para saída e confirme jobs longos de forma assíncrona. p95 curto <10 s; p99 longo <120 s.

- **Design inicial:** users → AI API; AI API → model.
- **Critérios de aceitação:** `aiContextErrors` <= 0 · `aiShortP95` < 10 s · `aiLongP99` < 120 s · `aiFactRecall` >= 90%.
- **Experimente:** Selecione AI API: divida entradas longas em trechos e ative confirmação em segundo plano. Um contexto maior é alternativa, com outro custo.
- **Observe:** Cada chamada exige tokens do trecho + saída reservada <= limite de contexto. Observe chamadas agregadas e a cota.

<div class="sdp" data-scenario="ai-summarizer" data-mode="compact" data-height="420"></div>

### 2. Assistente FAQ: pare de enviar o manual inteiro { #ai-faq }

Responda perguntas de funcionários a partir de um manual de 500 páginas. Hoje cada pedido envia 100.000 tokens do manual. Recupere seções relevantes, cite evidências e abstenha-se sem resposta. O fixture tem 80 perguntas respondíveis e 20 sem resposta; cada resposta exige três seções.

- **Design inicial:** users → AI API; AI API → model.
- **Critérios de aceitação:** `aiRetrievalRecall` >= 90% · Cobertura das fontes esperadas >= 95% · `aiAbstention` >= 90% · `aiTokenReduction` >= 80%.
- **Experimente:** Adicione Memory Fabric conectado a Vector DB. Selecione Memory Fabric para ajustar seções, evidência e abstenção.
- **Observe:** O recall conta seções esperadas recuperadas. A cobertura das fontes esperadas também exige evidências e penaliza responder perguntas sem resposta. Nenhuma verifica o texto gerado.

<div class="sdp" data-scenario="ai-faq" data-mode="compact" data-height="420"></div>

### 3. Assistente de pedidos: use uma ferramenta para fatos atuais { #ai-order-status }

Informe onde estão os pedidos. O modelo conhece políticas, não o estado atual. Adicione consulta autenticada. Trate pedidos proibidos, argumentos inválidos e falhas sem inventar. Todo estado informado deve vir de uma leitura válida para o usuário.

- **Design inicial:** users → AI API; AI API → model.
- **Critérios de aceitação:** `aiWrongStatus` <= 0 · `aiUnauthorized` <= 0 · `aiToolP95` < 3 s · `aiToolAttempts` <= 2.
- **Experimente:** Conecte a API ao Tool Registry e ao banco de pedidos. Aplique autorização e valide argumentos no código.
- **Observe:** Só resultados válidos podem virar respostas sobre estado. Limite tentativas e informe indisponibilidade.

<div class="sdp" data-scenario="ai-order-status" data-mode="compact" data-height="420"></div>

### 4. Ingestão de documentos: o índice fica para trás { #ai-ingestion }

Clientes enviam 10.000 documentos em cinco minutos. Extraia, divida, gere embeddings e indexe; o provedor permite 100 chamadas/s. Um worker cai em t=120 s. Confirme uploads em 500 ms, indexe 99% em dez minutos e recupere sem perdas nem trechos duplicados.

- **Design inicial:** uploads → upload API; upload API → originals; upload API → parse + chunk; parse + chunk → embeddings; embeddings → index.
- **Critérios de aceitação:** `aiAckP99` < 0.5 s · `aiIndexP99` < 600 s · `aiIndexErrors` <= 0 · `aiQuotaPeak` <= 100 calls/s.
- **Experimente:** Armazene o original e enfileire trabalho durável antes de confirmar. Concorrência não aumenta a cota de embeddings.
- **Observe:** Use IDs estáveis para indexação idempotente e persista progresso; repetir etapa interrompida deve ser seguro.

<div class="sdp" data-scenario="ai-ingestion" data-mode="compact" data-height="420"></div>

### 5. Busca empresarial: a resposta cruza o limite do tenant { #ai-tenant-search }

Um assistente atende 100 empresas com índice e cache compartilhados. Aplique permissões do usuário. Em t=60 s, revogue acesso; em até 30 s, consultas devem parar de revelar o documento. Teste cache da mesma pergunta entre identidades e a busca.

- **Design inicial:** users → AI API; AI API → answer cache; answer cache → retrieval; retrieval → shared index; retrieval → model.
- **Critérios de aceitação:** `aiUnauthorized` <= 0 · `aiRevocationS` <= 30 s · `aiPermittedRecall` >= 95% · `aiRetrievalP95` < 0.3 s.
- **Experimente:** Memory Fabric deve filtrar por tenant E ACL antes de retornar evidências. Relevância não implica autorização.
- **Observe:** Isole caches por tenant, usuário e versão de permissão; limite TTL de permissões. Meça a busca separada da geração.

<div class="sdp" data-scenario="ai-tenant-search" data-mode="compact" data-height="420"></div>

### 6. Agente de pesquisa: sobreviva a um reinício { #ai-research }

Gere relatórios que exigem dez chamadas ao modelo e vinte buscas de fontes. O worker reinicia em t=90 s. Conclua jobs aceitos, retenha evidências e reconecte usuários pelo estado persistido. Termine em cinco minutos sem exceder dez chamadas ou vinte buscas por job.

- **Design inicial:** research requests → research agent; research agent → model; research agent → research tools; research tools → source fetch.
- **Critérios de aceitação:** `aiJobCompletion` >= 99% · `aiJobP99` < 300 s · `aiRepeatedSteps` <= 1 · `aiBudgetViolations` <= 0.
- **Experimente:** Persista IDs, etapas e evidências no SQL; ative checkpoints no orquestrador. Streaming sozinho não recupera jobs.
- **Observe:** Defina orçamentos de chamadas e buscas. Limites menores que o necessário impedem a conclusão.

<div class="sdp" data-scenario="ai-research" data-mode="compact" data-height="420"></div>

### 7. Agente de reembolso: o timeout que paga duas vezes { #ai-refunds }

Um agente emite reembolsos aprovados. Vinte de 100 pagamentos efetivam antes do timeout; agente e executor podem repetir. Evite efeitos duplicados, exija autorização registrada e reconcilie resultados incertos em dois minutos.

- **Design inicial:** refund requests → support agent; support agent → model; support agent → refund tool; refund tool → payment provider.
- **Critérios de aceitação:** `aiDuplicateRefunds` <= 0 · `aiUnauthorized` <= 0 · `aiReconcileS` <= 120 s · `aiRefundCompletion` >= 99%.
- **Experimente:** Use ID estável entre tentativas e registro durável. ID novo faz a repetição parecer novo reembolso.
- **Observe:** Registre autorização da ação exata e reconcilie resultados incertos; timeout não significa ausência de pagamento.

<div class="sdp" data-scenario="ai-refunds" data-mode="compact" data-height="420"></div>

### 8. Roteamento de modelos: cumpra o orçamento sem perder qualidade { #ai-model-routing }

Classifique 50 tickets/s. A maioria é simples; alguns exigem raciocínio maior. Hoje todos usam o modelo caro. Roteie seletivamente e preserve classificações válidas durante falha de 30 s do provedor. Preços e resultados rotulados são sintéticos, não benchmarks.

- **Design inicial:** users → AI API; AI API → model.
- **Critérios de aceitação:** `aiClassification` >= 95% · `aiCostPerTicket` < 0.005 USD · `aiRoutingP95` < 3 s · `aiValidCompletion` >= 99%.
- **Experimente:** Selecione LLM Gateway: roteie tickets simples ao modelo pequeno, escale casos incertos e valide esquemas.
- **Observe:** Ative fallback para falhas do provedor. Compare custo e qualidade; sucesso HTTP é insuficiente.

<div class="sdp" data-scenario="ai-model-routing" data-mode="compact" data-height="420"></div>
