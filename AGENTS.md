# AGENTS.md

Instructions for AI coding agents (Claude Code, Codex, Cursor, Copilot, etc.) working in this repository. This is the **single source of truth** for agent guidance. `CLAUDE.md` imports this file, so edit here, not there.

## Project

**ML Quest** is a free, open-source browser game where players learn machine learning by training real models to beat levels. It's a static site on GitHub Pages: no backend, no login, works offline (PWA).

**Repo:** https://github.com/amide-init/ml-quest (default branch `main`, every push deploys to https://amide-init.github.io/ml-quest/, Vite `base` = `/ml-quest/`).

**Status:** Phase 0 – Prototype. The foundation is in place: Vite app in `client/`, the layered folder skeleton, strict TypeScript, lint and layer-boundary checks, and Vitest. The game features (app shell, engine, the first level W1-L3 "Roll Downhill") are next.

## Read these first

| File | Use it for |
|---|---|
| [PRD.md](./PRD.md) | *What* we build and why: levels, pass conditions, scope, roadmap |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | *How* it's built: modules, contracts, runners, evaluator, persistence, CI |
| [RULES.md](./RULES.md) | Rules every change must follow (MUST / SHOULD) |

If a request conflicts with these docs, point out the conflict before writing code. Don't silently pick one.

## Stack

React + TypeScript (strict) + Vite · Zustand · Zod · Web Worker training · SVG/Canvas plots, PixiJS (lazy) for scenes · Vitest + Playwright · pnpm · GitHub Actions → GitHub Pages · `vite-plugin-pwa`.
TensorFlow.js is only for World 4+ and **must not** enter the v1 bundle.

## Commands

**Node 24 LTS** (`.nvmrc` at the repo root, so run `nvm use`) and **pnpm only** (pinned via `packageManager`; `npm install`/`yarn` are blocked). Enable pnpm once with `corepack enable`.

The app lives in **`client/`**. Run every command from there (`cd client`), or from the root with `pnpm --dir client <script>`.

```bash
pnpm install
pnpm dev              # local dev server
pnpm build            # production build
pnpm typecheck        # tsc -b
pnpm lint             # lint:code + lint:boundaries
pnpm lint:code        # oxlint --deny-warnings (zero warnings allowed)
pnpm lint:boundaries  # dependency-cruiser layer rules (.dependency-cruiser.cjs)
pnpm format           # prettier --write · format:check in CI
pnpm test             # vitest run: "node" project (engine, services, repos, lib, tests/) + "dom" project (app, pages, components, hooks)
pnpm test:watch       # vitest in watch mode
pnpm test:coverage    # v8 coverage → client/coverage/

# Planned, NOT available yet (don't run until they exist in package.json):
# pnpm test:passbot     # replay every level solution through the engine
# pnpm test:e2e         # playwright
# pnpm levels:validate  # schema + cross-registry checks on content/levels
```

## Layout: layered architecture

```
ml-game/                repo root: docs (PRD, ARCHITECTURE, RULES, AGENTS, CLAUDE), docs/adr/, .github/
  client/               the Vite app. All paths below are relative to client/
    src/app/            composition root: Router (hash), providers, Container.ts (DI), error boundaries
    src/pages/          route screens (LevelPage, WorldMapPage, CodexPage…). Compose only, no logic
    src/components/     presentational: ui/ · widgets/ (emit commands) · viz/ (render snapshots) · game/
    src/hooks/          React adapters over services + stores (useLevelSession, useProgress…)
    src/stores/         Zustand UI state (thin; writes go through services)
    src/services/       ALL business logic: Level, Training, Evaluation, Progress, Hint, Codex, Export, Analytics
    src/repositories/   data access behind interfaces (+ InMemory* for tests, migrations/)
    src/models/         domain entities, types, Zod schemas (LevelModel, ProgressModel, CommandModel…)
    src/engine/         PURE ML engine: math, data, ml/algorithms, ml/optimizers, eval, session
    src/workers/        TrainingWorker.ts + WorkerProtocol.ts
    src/platform/ config/ lib/ i18n/
    content/            levels (JSON), solutions, concept cards (md), locales
    tests/              passbot/, e2e/
  server/               (future, v2+, optional). Never required by client/
```

Dependencies only point down: `pages → components/hooks → stores → services → repositories/engine → models`. See ARCHITECTURE.md §4 for the full layer table and naming conventions.

**File names are TitleCase and match the main export** (`ProgressService.ts`, `LocalStorageProgressRepository.ts`, `LevelModel.ts`, `LevelPage.tsx`). Exceptions: hooks (`useLevelSession.ts`), `main.tsx`/`index.ts`, tool configs, and content files named by id (`w1-l4.json`).

## Where does this code go?

| I'm writing… | Put it in | Named like |
|---|---|---|
| A new screen/route | `pages/` + route in `app/Router.tsx` | `CodexPage.tsx` |
| Reusable UI, a widget, a chart | `components/{ui,widgets,viz,game}/` | `LossCurve.tsx` |
| Glue between React and services | `hooks/` | `useLevelSession.ts` |
| Reactive UI state | `stores/` | `ProgressStore.ts` |
| A business rule or use case | `services/` | `ProgressService.ts` |
| Loading or saving data | `repositories/` (interface + impl + InMemory) | `ProgressRepository.ts`, `LocalStorageProgressRepository.ts` |
| A type, entity, Zod schema | `models/` | `LevelModel.ts` |
| ML math, dataset, metric, ML model | `engine/` | `LinearRegression.ts` |
| A new level | `content/levels/` (data only) | `w1-l4.json` + `w1-l4.solution.json` |

## Things that are easy to get wrong here

- **`engine` is pure.** Don't use `Math.random()`, `Date.now()`, `new Date()`, DOM, timers or React inside `client/src/engine`. Take an injected `rng`/clock instead. oxlint blocks most of these; `new Date()` isn't caught automatically, so reviewers must check for it.
- **"Model" means two things.** `src/models/` holds domain models (Level, Progress). ML models are **algorithms** in `src/engine/ml/algorithms/`.
- **Business logic goes in services only.** Pages and components never compute stars, unlocks or hints, and never touch `localStorage` or the engine.
- **Components are presentational.** They take props and emit callbacks. Only hooks call `useServices()`.
- **Layer rule failed in `pnpm lint:boundaries`?** Move the code to the right layer. Don't loosen `.dependency-cruiser.cjs`; changing a rule needs an ADR.
- **Repository implementations go in source subfolders** (`repositories/local-storage/`, `bundled/`, `in-memory/`), and interfaces stay at the top level. Never export implementations from `repositories/index.ts`.
- **Services get repositories by interface** through the constructor. Only `app/Container.ts` creates concrete classes. No singletons.
- **Levels are data.** A new level is JSON plus a solution file plus locale strings plus a concept card. If a level seems to need custom code, add a registry entry (metric, dataset, widget) instead.
- **Pass/fail only comes from the evaluator** (`EvaluationService` → `engine/eval`). Never add UI logic that marks a level as passed.
- **NaN is a feature.** Divergence under a high learning rate is intended gameplay (`status: "diverged"`). Don't clamp it away.
- **Hidden test set** data never goes to UI components. Only derived metrics do.
- **No literal player-facing strings** in levels or components. Use locale keys.
- **Persisted shape changed?** Update `models/`, bump the version, and add a migration in `repositories/migrations/` plus a fixture test.
- **TitleCase file names.** Name new files after their main export (`HintService.ts`, not `hint-service.ts` or `hint.service.ts`). To change only the case of an existing file, use `git mv`: macOS is case-insensitive and Linux CI is not.
- **Hash routing** (`/#/...`) and Vite `base` are set for GitHub Pages. Don't switch to browser history routing.

## Task playbooks

Follow these in order. Each step names the layer it belongs to.

### Add a new level
1. `content/levels/<world>/<id>.json`: config with `$schema`, `schemaVersion`, seed, dataset, algorithm, widgets, conditions, hint and debrief keys.
2. `content/levels/<world>/<id>.solution.json`: a scripted solution that reaches at least 1 star (ideally also a 3-star one). Add an anti-solution if the level has a misconception trap.
3. `content/locales/en/*.json`: mission, 3 hints, debrief strings.
4. `content/concepts/<concept>.md`: the codex card, if the concept is new.
5. Run `pnpm levels:validate && pnpm test:passbot`.
6. **Don't touch `client/src/`.** If you have to, you're missing a registry entry (see below).

### Add a metric, dataset generator or ML algorithm
1. Put the implementation in `engine/eval/metrics/`, `engine/data/generators/` or `engine/ml/algorithms/`, and register it in that folder's registry.
2. Add a unit test next to it: reference values, edge cases, and a gradient check for algorithms.
3. If a level config needs a new type or id, extend the Zod schema in `models/LevelModel.ts`.

### Add a business rule (e.g. a streak bonus)
1. Add the types to `models/`.
2. Add a method to the owning service in `services/`. Create a new service only if it's a new domain capability.
3. Write the test with `InMemory*` repositories and a fake clock.
4. Expose it to the UI through a hook in `hooks/`. Components still only receive props.

### Add or change persisted data
1. Update the entity and schema in `models/`.
2. Bump the version and add a migration in `repositories/migrations/`, plus a fixture test for the old shape.
3. Only the repository reads or writes storage. The service applies the rules.

### Add a screen
1. Create `pages/XxxPage.tsx` and add a route in `app/Router.tsx` (hash routing).
2. Build the screen from `components/`. Put data access in a hook, and put new UI pieces in `components/` as presentational components.
3. Add a Playwright smoke test if the screen is part of the core loop.

### Add a widget
1. Create `components/widgets/Xxx.tsx`. It emits a `Command`, and needs keyboard, touch and pointer support plus an accessible name and value text.
2. If there's a new control target, add it to `models/CommandModel.ts` and handle it in `TrainingService` and the engine.
3. Add a component test and a Playwright case.

## Before you finish a task

- [ ] Code sits in the correct layer and imports only point down (`pnpm lint` checks this)
- [ ] `pnpm typecheck && pnpm lint && pnpm test` pass (plus `test:passbot` for level or engine changes). Report the real output.
- [ ] No literal player-facing strings, no `Math.random()`/`Date.now()` in `engine/`, no storage access outside `repositories/`
- [ ] Docs, schema or ADR updated if a contract changed
- [ ] Stayed inside the current roadmap phase. Nothing was added that the task didn't ask for.

## How to work in this repo

- Keep changes scoped to the current roadmap phase (see PRD → Roadmap). v1 is frozen at 16 levels across Worlds 1–2.
- For engine work: write or update the Vitest tests with the change. ML algorithms need a finite-difference gradient check.
- For service work: test with `InMemory*` repositories and a fake clock.
- Tests sit next to the source as `Xxx.test.ts(x)`. The folder decides the environment: `app/`, `pages/`, `components/` and `hooks/` run in **jsdom**, and everything else runs in plain **Node**. If a non-UI test needs the DOM, the code is in the wrong layer. Import `describe`/`it`/`expect` from `vitest` explicitly; there are no globals.
- For a new level: add the config, `*.solution.json` (and an anti-solution if the level has a trap), strings, and concept card. Then run `levels:validate` and `test:passbot`.
- If a change alters a contract in ARCHITECTURE.md, update the doc or add an ADR in the same change.
- Use Conventional Commits (`feat(services): …`, `content(w1): …`). Don't commit or push unless asked.
- Before calling work done, run typecheck, lint and test, and report the real results.
