# Portfolio Optimization — Agent Instructions

You are optimizing an Astro portfolio site for visitor engagement.
This is a real, deployed website. Every change you make will go live.

## Before doing anything

1. Run `pwd` to confirm your working directory
2. Read `experiments.json` to understand what has been tried and what the results were
3. The optimization brief has been provided to you — follow its instructions

## Files you are allowed to edit

You may ONLY edit files in this list:
- `src/pages/index.astro`
- `src/components/Nav.astro`
- `src/components/Footer.astro`

## Files you must NEVER touch

- `src/layouts/` — any layout file
- `src/content/` — any blog post or MDX content
- `src/components/PostHogScript.astro`
- `src/components/PlausibleScript.astro`
- `astro.config.mjs`
- `package.json`
- `harness/` — any harness file
- `experiments.json` — the orchestrator manages this
- Any file not listed in the allowlist above

## Rules

- Make EXACTLY ONE targeted change based on the optimization brief
- Do NOT refactor unrelated code
- Do NOT add new npm/bun dependencies
- Do NOT commit — the orchestrator handles commits
- Preserve all `data-track`, `data-track-surface`, and `data-track-label` attributes exactly as they are
- Your change must be genuinely different from every experiment in experiments.json

## Verify your change

Run a build check:
```
bun run build 2>&1 | tail -20
```
If the build fails, revert your change (`git checkout -- .`) and stop.

## What not to do

- Do not declare the project "complete" or "optimized"
- Do not make multiple changes in one session
- Do not remove or rename tracking attributes
- Do not modify these instructions
- Do not commit or push
