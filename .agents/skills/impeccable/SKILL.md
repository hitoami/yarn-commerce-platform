---
name: impeccable
description: Design, implement, or review the yarn storefront UI using approved visual direction and Impeccable workflows.
version: 4.2.0
user-invocable: true
argument-hint: "[shape · audit|critique · animate|bolder|colorize|delight|layout|overdrive|quieter|typeset · adapt|clarify|distill · harden|onboard|optimize|polish · init|document|extract|live] [target]"
license: Apache 2.0
---

# Impeccable

Design and review the requested surface within the approved product scope and visual direction. For this yarn project, read `docs/agents/visual-review.md` for image language, Comp-first approval and finish evidence; root `AGENTS.md` owns data and production boundaries.

## Project retention override

Root `AGENTS.md` owns what persists. Keep only current decisions, approved direction and required asset provenance in canonical documents. References and agents may require local review, verdict or build outputs for execution; these remain ignored temporary files, never committed or uploaded as process archives. Perform required checks and independent review, summarize final results in the PR, and do not create separate tracked review reports. Load only the current surface and relevant reference; do not recursively read historical review/build/content directories. New approved visuals belong in `docs/design/approved/` with a surface-brief link. Do not force-add process artifacts or duplicate them under another path.

## Project flow override

This project's page design flow is defined in `docs/agents/visual-review.md` (one mobile comp → mobile build → user OK → one desktop comp → desktop build, all in one thread). It overrides the Comp-first gates, `concept-seed` direction rounds, `build-phase` gates, `comp-diff` and independent finish review in the references; use those only when the user explicitly asks.

## Start and select a workflow

1. Run `<skill-base-dir>/scripts/impeccable context` once per session, keeping cwd at the project. The loaded skill base resolves command paths in this skill and its references; `.github/skills/impeccable` is the fallback. Pass `--target <path>` for a known route or source file. The launcher uses its bundled binary or downloads it on first run.
2. Load only the reference for the requested command below. New surfaces or replacement visual worlds use [new-work.md](reference/new-work.md). Inspect the target and current visual evidence before editing; missing `DESIGN.md` alone does not imply a new design.
3. Immediately before UI edits, read [craft-floor.md](reference/craft-floor.md). Planning-only work does not need it.

Follow the user's approved brief. Refinement preserves identity, behavior, factual copy and everything outside scope; replacement redesign preserves product truth and function while replacing the visual world. Do not invent claims. Reuse existing approval for the same direction and scope.

Choose a surface mode from visitor intent: **Persuade** (decide and act), **Operate** (complete a task), **Read** (understand), or **Experience** (view the work itself). Record it in the surface brief only; [operate.md](reference/operate.md) adds Operate / Read guidance when relevant.

Batch desktop and mobile self-QA, fix the observed defects together, then confirm. Stop polishing once required checks pass. A failed check remains unresolved until fixed or reported; a self-QA limit never waives required finish review or permits a false completion claim.

For responsive UI changes, apply `critique` and `adapt` to actual screenshots before handoff. Technical `detect` / overflow success is not visual acceptance. Follow the desktop composition and empty / populated state checks in `docs/agents/visual-review.md`; repair disconnected alignment, unjustified full-width elements and dead space within the approved direction before reporting desktop completion.

## Commands

| Command | Category | Description | Reference |
|---|---|---|---|
| `craft [feature]` | Build | Deprecated alias for an ordinary new-work request | [reference/craft.md](reference/craft.md) |
| `shape [feature]` | Build | Plan UX/UI before writing code | [reference/shape.md](reference/shape.md) |
| `init` | Build | Capture durable product context in PRODUCT.md | [reference/init.md](reference/init.md) |
| `document` | Build | Generate DESIGN.md from existing project code | [reference/document.md](reference/document.md) |
| `extract [target]` | Build | Pull reusable tokens and components into design system | [reference/extract.md](reference/extract.md) |
| `critique [target]` | Evaluate | UX design review with heuristic scoring | [reference/critique.md](reference/critique.md) |
| `audit [target]` | Evaluate | Technical quality checks (a11y, perf, responsive) | [reference/audit.md](reference/audit.md) · native: [reference/audit.native.md](reference/audit.native.md) |
| `polish [target]` | Refine | Final quality pass before shipping | [reference/polish.md](reference/polish.md) |
| `bolder [target]` | Refine | Amplify safe or bland designs | [reference/bolder.md](reference/bolder.md) |
| `quieter [target]` | Refine | Tone down aggressive or overstimulating designs | [reference/quieter.md](reference/quieter.md) |
| `distill [target]` | Refine | Strip to essence, remove complexity | [reference/distill.md](reference/distill.md) |
| `harden [target]` | Refine | Production-ready: errors, i18n, edge cases | [reference/harden.md](reference/harden.md) |
| `onboard [target]` | Refine | Design first-run flows, empty states, activation | [reference/onboard.md](reference/onboard.md) |
| `animate [target]` | Enhance | Add purposeful animations and motion | [reference/animate.md](reference/animate.md) |
| `colorize [target]` | Enhance | Add strategic color to monochromatic UIs | [reference/colorize.md](reference/colorize.md) |
| `typeset [target]` | Enhance | Improve typography hierarchy and fonts | [reference/typeset.md](reference/typeset.md) |
| `layout [target]` | Enhance | Fix spacing, rhythm, and visual hierarchy | [reference/layout.md](reference/layout.md) |
| `delight [target]` | Enhance | Add personality and memorable touches | [reference/delight.md](reference/delight.md) |
| `overdrive [target]` | Enhance | Push past conventional limits | [reference/overdrive.md](reference/overdrive.md) |
| `clarify [target]` | Fix | Improve UX copy, labels, and error messages | [reference/clarify.md](reference/clarify.md) |
| `adapt [target]` | Fix | Adapt for different devices and screen sizes | [reference/adapt.md](reference/adapt.md) · native: [reference/adapt.native.md](reference/adapt.native.md) |
| `optimize [target]` | Fix | Diagnose and fix UI performance | [reference/optimize.md](reference/optimize.md) |
| `live` | Iterate | Visual variant mode: pick elements in the browser, generate alternatives | [reference/live.md](reference/live.md) |


## Routing and maintenance

- Explicit or clearly implied command: use that reference. Resolve ordinary overlap from scope; ask only when the choice changes the user's intended result.
- Bare `/impeccable` with no task: read [routing.md](reference/routing.md) and show its suggestions. A concrete design request should proceed through the matching workflow, not stop at a menu.
- General design: new surface / replacement → [new-work.md](reference/new-work.md); missing `PRODUCT.md` in that workflow → [init.md](reference/init.md). Narrow refinement proceeds from incumbent evidence as `context` directs.
- `teach` aliases `init`; `craft` is a deprecated new-work alias. `shape` discovers UX scope, then enters new-work for visual direction decisions. Resume after init without rerunning `context`.
- `pin <pin|unpin> <command>` manages standalone command shortcuts. Run through the skill launcher and report its result; preserve error stderr.
- `hooks <on|off|status|ignore-rule|ignore-file|ignore-value|reset>`: read [hooks.md](reference/hooks.md) when requested.
- `doctor`: read [doctor.md](reference/doctor.md) when asked to inspect or repair stale Impeccable artifacts. Report `CONTEXT_STALE` during unrelated tasks; do not repair it unless requested, except fields marked `auto` updated by the next normal write.
