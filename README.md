# System Design Playground

A browser-based system design simulator and the 2027.1 course reference. The site is published in English.

## Local development

Python 3.12 and dependencies are managed with [uv](https://docs.astral.sh/uv/):

```sh
uv sync --frozen
uv run zensical-i18n serve
```

Open http://127.0.0.1:8000/platform/playground/.

For the standalone JavaScript playground without a site build:

```sh
python3 -m http.server 8765
```

Open http://localhost:8765/scripts/playground/harness.html.

## Build and deployment

```sh
uv run zensical-i18n build --clean
```

GitHub Actions runs the tests and content checks on pushes and pull requests. Validated builds on `main` deploy to GitHub Pages; pull requests do not deploy.

- Site: https://seijimatsumoto.github.io/platform/
- Playground: https://seijimatsumoto.github.io/platform/playground/

The build publishes 2027.1 and shared app/reference content. Older editions and Portuguese sources remain archived in the repository and are excluded from publication. English changes do not require Portuguese translations.
