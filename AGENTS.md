# Repository Guidelines

## Project Structure & Module Organization

This repository publishes an English-only fork of Insper’s Platforms/System Architecture course using Zensical. Course content lives in `docs/`, including edition directories (`2026.2/`, `2027.1/`), shared references in `appendix/`, and the simulator in `playground/`. Browser scripts, styles, and images live under `docs/assets/`. Validation, simulator tests, slide tooling, and lab snapshot generation live in `scripts/`. `zensical.toml` defines navigation and site configuration; `pyproject.toml` and `uv.lock` manage Python dependencies. Treat `site/` as generated output.

## Build, Test, and Development Commands

Use Python 3.12 and uv; use `uv add <package>` for dependencies, never pip.

- `uv sync --frozen`: install locked dependencies.
- `uv run zensical-i18n serve`: preview the English site locally.
- `uv run zensical-i18n build --clean`: build the English site.
- `node scripts/csim/test.mjs [names]`: run all concept-model tests or selected simulators.
- `node scripts/playground/test_engine.mjs`: test the Playground engine.
- `node scripts/diagram/test.mjs`: validate 2027.1 diagram syntax.
- `uv run scripts/handouts/snapshots.py --check`: validate lab overlays and included excerpts.

## Coding Style & Naming Conventions

Match surrounding files: JavaScript generally uses two-space indentation; Python uses four spaces. No repository-wide formatter or linter is configured. Use descriptive, hyphenated content filenames. Maintain English content only; archived `.pt.*` translations do not need updates. Register new navigation entries in `zensical.toml`.

Use theme tokens for simulator colors. Edit slide `.src.md` sources, then regenerate committed HTML with `uv run scripts/slides/build.py`; never hand-edit generated slides or `site/`.

## Testing Guidelines

Simulator tests use custom Node.js assertions and `<name>.test.mjs` files under `scripts/csim/`. No numeric coverage threshold is configured. Test changed models and run relevant content validators before submitting. When changing lab settings used by simulators, update `scripts/csim/lab-values.mjs`, model constants, and bilingual tips. Inspect rendered pages for visual changes.

## Commit & Pull Request Guidelines

Recent commits use descriptive, sentence-style subjects, often prefixed with an edition or topic, such as `2027.1 lab 12: ...`. Follow that pattern. PRs should describe affected pages or behavior, list validation performed, link relevant issues, and include screenshots for visual changes. Deployment runs on pushes to `main`; run checks locally before review.
