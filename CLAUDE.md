# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Course documentation site for Insper's Platforms & Microservices course (5th semester, 80 hours), built with [Zensical](https://zensical.org) (`modern` variant, light/dark/system palette toggle) configured in `zensical.toml`. Content covers distributed systems, containerization, microservices, DevOps, security, and observability. Instructor: Humberto Sandmann.

## Setup

Dependencies are managed with [uv](https://docs.astral.sh/uv/): `pyproject.toml` + `uv.lock`, Python 3.12
from `.python-version`. Never use pip or `requirements.txt`.

```bash
uv sync                        # create .venv/ and install exactly what uv.lock pins
uv add <package>               # add a dependency (updates pyproject.toml and uv.lock)
```

No activation needed: prefix commands with `uv run`.

## Common Commands

```bash
uv run zensical-i18n build            # Build the English site into site/
uv run zensical-i18n serve            # Preview English at http://127.0.0.1:8000/platform/ (live reload)
```

`zensical-i18n` wraps `zensical` (same options); plain `zensical build` still works but builds only one language.

Zensical has no `gh-deploy`: CI builds `site/` and deploys a Pages artifact with `actions/deploy-pages`. Unsupported MkDocs plugins are ignored silently, so check the generated HTML when adding a plugin.

`matplotlibrc` (project root) forces the `Agg` backend: Zensical renders pages on worker threads, where `markdown-exec` plots fail with GUI backends.

## Architecture

This is a documentation repository — no application code, no tests.

**Content lives in `docs/`**, organized as:
- `docs/classes/` — lecture notes (distributed systems, containerization, microservices, architectures)
- `docs/hands-on/` — 7 numbered lab modules (0–6): prerequisites → CRUD → gateway → security → DevOps → orchestration → observability
- `docs/exercises/` — graded student assignments (product, order, exchange, jenkins, minikube, bottlenecks, team project)
- `docs/versions/` — versioned course editions (2024.1–2026.1) with grading rubrics and schedules
- `docs/appendix/` — edition-independent reference (overview `appendix/index.md`; networking, security, APIs, tooling), with the 2027.1 simulators and `diagram` blocks

**`zensical.toml`** is the central config (everything under `[project]`). TOML has no `!!python/name` tags: functions are referenced as strings (e.g. `"zensical.extensions.emoji.twemoji"`). It defines navigation, plugins, and Markdown extensions. Key capabilities enabled:
- Mermaid diagram rendering (via superfences)
- Embedded Python execution in Markdown (via `markdown-exec`)
- Image lightbox (`glightbox`), search, HTML minification
- Terminal animations: the `termynal` Markdown extension converts code blocks preceded by `<!-- termynal -->`; its assets are vendored in `docs/assets/` and initialized by `termynal-init.js`
- `exclude` plugin keeps `2026.2/exams/` out of the build (Zensical does not support `exclude_docs`)

No git-based revision dates/authors: Zensical does not support the `git-*` plugins.

### English-only publication

This fork publishes and maintains English only. Keep using `zensical-i18n` so archived
`.pt.*` files are recognized and omitted from the English build. Portuguese is registered
with `build = false`; no `/pt/` site or language selector is published. Existing Portuguese
source files and JavaScript strings are archives; do not add or synchronize translations
unless the user requests them. Translation parity checks are not a contribution requirement.

### Slides (Marp), 2026.2

Every 2026.2 class and hands-on has a summary deck at `<topic>/slides/<slug>.src.md`, in Marp Markdown,
embedded in the topic's overview page under `## Slides`:

```html
<div class="slides-embed">
  <iframe src="slides/<slug>.html" title="Slides: ..." loading="lazy" allowfullscreen></iframe>
</div>
```

`uv run scripts/slides/build.py` (or `--only <src.md>`) runs the Marp CLI (`npx`, version pinned, needs
Node) into `<slug>.html` next to the source; the built `.html` is committed, so CI needs no Node.
**Edit the `.src.md`, never the built `.html`**; `--check` fails when a deck is stale. `uv run scripts/slides/overflow.py [src.md…]` renders
each deck in headless Chrome and fails when a slide overflows its 1280×720 frame. The `exclude`
plugin keeps `*/slides/*.src.md` out of the site. `{{INCLUDE:path}}` (relative to the repo root)
inlines a file before Marp runs.

Every deck uses the theme `scripts/slides/theme.css` (`theme: platform`), which mirrors the site's
fonts and light/dark palettes, and includes `scripts/slides/theme.js` in its first slide so it follows
the palette of the page that embeds it. Writing rules: each slide is a fixed 1280×720 (≤ ~7 bullets,
one table, or a short code block — split otherwise; `<!-- _class: tight -->` for dense slides);
`-` lists, `*` only to reveal an answer one item at a time; boxes `.q` (question), `.ok`
(takeaway), `.warn` (pitfall); `.cols` for two columns; no Mermaid (Marp does not render it);
speaker notes as HTML comments; last slide `## Takeaways`.
Diagrams in a deck are HTML boxes with the generic classes of `scripts/slides/diagram.css` (`.box`, `.chip`,
`.matrix`, `.flow`, `.group`, `.arrow`; tones `.accent`/`.orange`/`.green`/`.red`/`.muted`), included in the first
slide with `<style>{{INCLUDE:scripts/slides/diagram.css}}</style>` (that file has no blank lines nor tag names).

### 2027.1 and the Playground

`docs/2027.1/` (the System Design edition) and `docs/playground/` (the System Design Playground
simulator, edition-independent, at `/platform/playground/`) are published and listed in the nav.
This fork publishes 2027.1 as the current edition at the top level of navigation. Older
2024–2026 editions are retained as source archives but excluded from the published site
through `project.plugins.exclude.glob`. Do not add links to excluded editions from live pages.
The 2027.1 block sits between `# >>> 2027.1 nav` and `# <<< 2027.1 nav` in `zensical.toml`.
The simulator code is `docs/assets/javascripts/playground/*.js` +
`assets/stylesheets/playground.css`; engine tests: `node scripts/playground/test_engine.mjs`.
`SDP.catalogBase` in `catalog.js` sets where "Learn more" points (the edition's component catalog).

### AI architecture practice

The main Playground's eight AI scenarios are architecture exercises (`architecture: true`), not parameter puzzles. They use incomplete canvases, outcome requirements, ordered calls, optional hints/references, and a persisted, ungraded design explanation. `ai.js` checks ownership, call order, boundaries, and component-removal reachability. It must not claim to verify ACL logic, stable operation IDs, answer quality, or routing policy from a diagram. The application can coordinate a fixed workflow without a separate orchestrator. AI exercises hide performance settings and monthly-cost charts; the other scenarios retain the load simulator. Run `test_ai.mjs` and `test_url.mjs` under `scripts/playground/` after changes.

### Hands-on labs (2027.1): incremental and autonomous

One student repository, `boxoffice/`, grows from lab 0 to lab 13. `docs/2027.1/hands-on/<n>/code/` is
an overlay: every file the lab adds or changes, in full, at its repo-relative path (`code/DELETED`
lists removals); pages include them with `--8<--`. The state after lab N is the overlay of labs 0..N.
Each lab has "Start state", "Catch up" (link to `../<N-1>/boxoffice-after-lab-<N-1>.zip`) and "End
state", and must be followable by a student alone: full files, commands with their directory,
"You should see…" checkpoints, troubleshooting, clean-up, deliverable checklist.

```bash
uv run scripts/handouts/snapshots.py           # build boxoffice-after-lab-<n>.zip (CI does it; gitignored)
uv run scripts/handouts/snapshots.py --check   # includes exist, YAML/JSON of the overlays parse
```

### Classes (2027.1): one story, linked to the code

The classes are chapters of one story (`2027.1/index.md#story`: problem → class → lab → code → scenario).
Each overview has `!!! quote "The story so far"` before the learning objectives and
`## What breaks next { #what-breaks-next }` after the key takeaways; each subpage has
`## How it connects { #how-it-connects }` and a `!!! success "Best practices"` box right before its pitfalls
(labs: `"Best practices in this lab"`, naming the file and the class section). Where a lab implements a concept, the class page shows the real
file in `!!! example "In the BoxOffice code: … (lab N)"`, included from the overlay with a line range
(`--8<-- "docs/2027.1/hands-on/<n>/code/<path>:start:end"`). **When you change lab code, run
`snapshots.py --check`**: it fails when a class page's range no longer fits the file or starts on a blank
line, but it cannot tell that the range moved to other code — check the excerpts of the file you changed
(`grep -rn "<file name>" docs/2027.1/classes`). It also checks the lab values the concept simulators copy (below): a failure names
the simulator, the pages and the tip to update.

Network simulators (class 12): `<div class="netsim" data-tool="cidr" data-cidr="…">` (address explorer) and
`<div class="netsim" data-tool="packet" data-scenario="…">` (packet walk through the BoxOffice VPC: route tables,
NAT, security groups), in `docs/assets/javascripts/netsim.js` + `assets/stylesheets/netsim.css`; the engine is
pure and tested with `node scripts/playground/test_netsim.mjs`. Support data (concept map, study cards):
`node scripts/support/validate.mjs` validates English data and page counts. Portuguese support datasets are archived and do not need updates.

Concept simulators (2027.1 and the appendix): `<div class="csim" data-sim="<name>" data-…="…"></div>`, followed by a
`!!! tip "Try it"` (pt `"Experimente"`) whose numbers come from the model. `docs/assets/javascripts/csim/core.js`
is the only one listed in `zensical.toml`: it loads `csim/<name>.js` on demand and gives the modules the shared
controls (player, sliders, choices, switches, stat tiles, log, live chart). Each module keeps a pure, seeded
model exported with `module.exports` (tests: `node scripts/csim/test.mjs [names]`, one `<name>.test.mjs` each)
and adds its own rules with `CSim.style`. **Colors only from the theme**: classes and `--c-*` tokens of
`assets/stylesheets/csim.css` (Material's variables; status colors shared with the Playground and netsim),
never a literal color in a module. `hash-ring.js` is the reference module.

**Lab values in simulators: one source, checked.** A simulator never copies a lab setting silently. Every value it
takes from a lab (a TTL, partitions, breaker thresholds, the HPA…) is registered in `scripts/csim/lab-values.mjs`
(the value, the lab file the tip cites, and how to read it there) and lives in the module only as `LAB.<key>`
(exported; defaults and model read it from there, no second literal). A fact the tip merely quotes (`ack-mode: record`)
is registered with `module: false`. The tests take those inputs from `M.LAB` and assert every model number the tip
prints with `tipHas(sim, lang => […])` (lib.mjs, English only). `lab-values.test.mjs` fails when a lab file no
longer gives the registered value, when a module's `LAB` or a page's `data-*` differs, when a quoted fact leaves
the tip, or when `LAB` holds an unregistered key. So: **when you change a lab setting** that a simulator uses,
update the registry entry and `LAB`, run `node scripts/csim/test.mjs <sim>`, and rewrite the tip numbers it
reports (English only); **when you write a simulator that uses a lab value**, register it the same way.

Quiz pages (2026.2, 2027.1 and `appendix/network/quiz.md`) keep plain Markdown (**Qn.** question, `- A.` … options, `??? success "Answer"` / `"Resposta"`
whose first bold starts with the letter); `assets/javascripts/quiz.js` turns each `##` section into one compact quiz box (the AI course's layout: numbered rows, lettered
options, one "Check answers" per box with the score in its header, explanations after Check).

Every class and exercise page opens with `!!! objectives "Learning objectives"` (pt `"Objetivos de aprendizagem"`): a lead-in line, then one
`- **Verb** …` item per objective (numbered rows, the leading bold verb as a chip; styled in `extra.css`).
Every class page closes with `## Key takeaways { #key-takeaways }` (pt `## Pontos-chave`) followed by the list
inside `!!! takeaways ""` (a highlighted box, styled in `extra.css`).

**`site/`** is generated output — never edit manually; it's rebuilt on deploy.

## CI/CD

GitHub Actions (`.github/workflows/main.yaml`) validates every push and PR (Node tests, content checks, handouts, and the English build). Pushes to `main` and manual runs on `main` deploy the validated Pages artifact with `actions/deploy-pages`; PRs never deploy. Pages uses the GitHub Actions publishing source. This fork is published at `https://seijimatsumoto.github.io/platform/`.

## Content Patterns

Markdown files use pymdownx extensions heavily:

- **Tabs**: `=== "Tab Name"` blocks
- **Admonitions**: `!!! tip "Title"` / `??? note "Collapsible"` (types: note, tip, info, warning, danger, example, etc.)
- **Diagrams**: ` ```mermaid ``` ` fenced blocks (Mermaid v11). In 2026.2 and 2027.1 use ` ``` mermaid-sim ` instead: same Mermaid source, rendered by `assets/javascripts/mermaid-sim.js` as a step-by-step simulator (flowchart edges, sequence messages and state transitions play in source order, with a clickable progress bar, speed and a caption; class diagrams stay static). It draws with Mermaid's `base` theme fed from the page palette, so do not add `classDef`/`style` colors that fight the theme. **In 2027.1 use ` ``` diagram ` (static) and ` ``` diagram-sim ` (step by step) instead**: the same Mermaid syntax (flowchart, sequence, state) drawn by our own renderer `assets/javascripts/diagram.js` + `assets/stylesheets/diagram.css` — ELK layout loaded on demand, sequence layout of its own, theme colors only, `:::comp` / `:::tech` / `:::problem` as tones; a diagram that would shrink below a readable size is laid out narrower or in the other direction. Other diagram types (ER, Gantt, class) stay ` ```mermaid `. `node scripts/diagram/test.mjs` parses every 2027.1 diagram (fails on a line it does not understand)
- **Card grids**: `<div class="grid cards" markdown>` with `-   __Title__` list items

Embed Python and produce output (matplotlib, seaborn, numpy, pandas) directly in Markdown via `markdown-exec`:

````markdown
```python exec="true"
import matplotlib.pyplot as plt
# code here
```
````

Include another Markdown file verbatim with `markdown-include`:

```markdown
{!path/to/file.md!}
```

Navigation structure is explicitly declared in `zensical.toml` — adding a new page requires updating the `nav` array there. Quote numeric titles (`"2026.2"`): an unquoted `2026.2` is a dotted key in TOML.
