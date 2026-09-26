# ML Quest — Architecture

> Status: **v0.4** (Phase 0 in progress: foundation built; layered structure; v2+ compute & backend strategy) · Owner: @Amin Uddin · Last updated: 2026-09-26
> Source of truth for *what* we build: [PRD.md](./PRD.md). This document covers *how*.
> Repo: [amide-init/ml-quest](https://github.com/amide-init/ml-quest) · Live (after first deploy): https://amide-init.github.io/ml-quest/
> Engineering rules that apply to every change: [RULES.md](./RULES.md).

---

## 1. Architectural drivers

These PRD requirements shape the design most. When a decision is unclear, check it against this list.

| # | Driver | Consequence for the design |
|---|---|---|
| D1 | **You pass by making a model work** (core promise) | Pass/fail comes from a pure, deterministic evaluator run on real model output. It never comes from UI state. |
| D2 | **Contributors add levels without touching the engine** | Levels are **data** (validated JSON) that reference **registries** (datasets, models, widgets, metrics). Levels contain no code. |
| D3 | **No level is impossible** | Each level ships with a scripted solution. CI replays it headlessly against the real engine. |
| D4 | **Static site, no backend, offline (PWA)** | Everything runs client-side. Progress is stored locally with a versioned schema. Hash routing works on GitHub Pages. |
| D5 | **30+ fps training on a mid-range phone, < 3 s first load on 4G** | Training runs off the main thread, snapshots are throttled, code is split per world, and CI enforces a bundle budget. |
| D6 | **Hidden test set teaches overfitting** | Every dataset is generated as a seeded train/test pair. The test split is never rendered or sent to the UI **before it has been judged**. After a judged Check, a level may reveal the test points it just scored (W2-L4 draws them, crossing out the misclassified ones); any change of settings hides them again. |
| D7 | **Worlds 4+ need neural nets (TF.js)** | The `Algorithm` interface (ML model contract) doesn't depend on any backend. TF.js is lazy-loaded behind it, and v1 never ships it. |

---

## 2. System overview

The app uses a **layered architecture**. Each layer has one job, and dependencies only point downward.

```
┌────────────────────────────────── Browser (main thread) ──────────────────────────────────┐
│                                                                                           │
│   PRESENTATION   pages/  ───────▶  components/ (ui · widgets · viz · game)                │
│                    │                     ▲ props / callbacks                              │
│                    ▼                     │                                                │
│   STATE          hooks/  ◀──────▶  stores/ (Zustand, thin UI state)                       │
│                    │                                                                      │
│                    ▼                                                                      │
│   APPLICATION    services/   LevelService · TrainingService · EvaluationService ·         │
│                              ProgressService · HintService · CodexService · ExportService │
│                    │                 │                         │                          │
│                    ▼                 ▼                         ▼                          │
│   DATA / DOMAIN  repositories/     engine/ (PURE ML)          platform adapters           │
│                  Level · Progress  math · data · ml ·         (analytics, audio)          │
│                  Settings · Concept eval · session reducer                                │
│                    │                 │  runs inline or in ──▶ workers/training.worker     │
│                    ▼                 ▼                                                    │
│                  localStorage,     models/  (domain entities, types, Zod schemas;         │
│                  JSON chunks                 shared by every layer)                       │
└───────────────────────────────────────────────────────────────────────────────────────────┘
          ▲ static assets + service worker (precache)          │ anonymous events
          │                                                    ▼
   GitHub Pages ◀── GitHub Actions (validate → test → pass-bot → build → deploy)   GoatCounter / Plausible
```

**The core idea:** `engine/` is a small, pure, deterministic ML and evaluation engine. It doesn't import React, the DOM, or storage. **Services** are the only callers of the engine and repositories from the app, and they hold all business rules. **Pages and components** are UI only. The pass-bot, unit tests and the Web Worker call the engine directly. Keeping the engine pure and the business rules in services is what makes D1, D3 and D5 achievable, and gives new developers a clear place for every kind of code.

---

## 3. The level model: one abstraction for every level

Every level in the PRD, from "Draw the Line" to "Border War", fits one tuple:

```
Level = Dataset × Algorithm × Optimizer × Controls × Evaluator (+ narrative: mission, hints, debrief)
```

The difference between levels is **what the player controls**:

| Player controls… | Example levels | Optimizer slot |
|---|---|---|
| **Parameters** directly | W1-L1 Draw the Line, W1-L2 Feel the Loss, W2-L1 Split the Kingdom | `manual` (the player *is* the optimizer) |
| **Steps** of the optimizer | W1-L3 Roll Downhill, W1-L5 Bumpy Terrain | `manual-gd` (player triggers each step, picks start) |
| **Hyperparameters** | W1-L4 Too Fast Too Slow, W2-L5 Tame It, W2-L7 Read the Matrix | `gd` / `sgd` with player-set LR, λ, threshold |
| **Data** | W1-L6 Dirty Data, W2-L6 Unfair Data | `gd`, run after the player edits the data |
| **Features / architecture** | W1-L7 Scale Matters, W2-L3 Not a Straight Line, W2-L4 The Overfitter | `gd`, with a model rebuilt from player choices |

Because of this, **widgets never talk to models directly**. A widget is bound to a **control target** and emits typed **commands**:

```ts
type ControlTarget =
  | { kind: "param";      path: string }          // e.g. "w0", "b"
  | { kind: "hyperparam"; name: "lr" | "lambda" | "threshold" | "degree" | ... }
  | { kind: "data";       op: "remove" | "add" | "reweight" }
  | { kind: "feature";    name: "scale" | "poly" | ... }
  | { kind: "action";     name: "train" | "step" | "reset" };
```

This gives us:
- a new level is usually **only config**, as long as the widgets and control targets already exist;
- every player action is a serializable command, so a session is an **event log** we can replay (pass-bot, bug reports, analytics);
- "moves" and "steps" metrics are just counts of commands in the log.

---

## 4. Code structure: layered architecture

### 4.0 Repository layout

The repo root holds project docs and CI. The web app is self-contained in **`client/`**, and future parts get sibling folders, so the root never becomes a mix of app and non-app code.

```
ml-game/
  client/                 # the Vite + React app (everything the game ships), with its own package.json
  server/                 # (future, v2+ only, optional) backend, see §17.4
  docs-site/              # (future, optional) Astro Starlight contributor docs
  docs/adr/               # architecture decision records
  .github/workflows/      # CI + GitHub Pages deploy (runs in client/)
  PRD.md · ARCHITECTURE.md · RULES.md · AGENTS.md · CLAUDE.md · README.md · LICENSE
```

Unless stated otherwise, every path in this document (`src/…`, `content/…`, `tests/…`) is **relative to `client/`**.

### 4.1 Folder layout (`client/`)

```
client/
  index.html · vite.config.ts · tsconfig*.json · package.json · .dependency-cruiser.cjs
  public/                 # static files copied as-is (icons, manifest, precomputed assets)
src/
  app/                    # Composition root: App.tsx, router (hash), providers,
                          #   Container.ts (DI), error boundaries, theme provider
  pages/                  # One file per route. Composes components + hooks. No business logic.
    HomePage.tsx
    WorldMapPage.tsx
    LevelPage.tsx
    CodexPage.tsx
    SandboxPage.tsx       # (v2)
    SettingsPage.tsx
    ImportPage.tsx
  components/             # Reusable, presentational. Data in via props, events out via callbacks.
    ui/                   # Design-system primitives: Button, Card, Modal, Slider, Toggle, Toast
    widgets/              # Level controls: DragPoints, LearningRateSlider, FeatureToggle,
                          #   DrawCanvas, LayerBuilder → emit Commands, never call services
    viz/                  # Pure snapshot views: LossCurve, ScatterPlot, DecisionBoundary,
                          #   LossLandscape, ConfusionMatrix
    game/                 # Game pieces: Mascot, MissionCard, ResultPanel, DebriefCard,
                          #   StarRating, HintDrawer, WorldNode
  hooks/                  # React adapters over services + stores:
                          #   useServices, useLevelSession, useProgress, useSettings, useCodex
  stores/                 # Zustand stores: ProgressStore.ts, SettingsStore.ts, SessionStore.ts
                          #   (hold UI-facing state; write through services, never repositories)
  services/               # Application/business logic. Plain TS classes, no React.
    LevelService.ts          # load + validate level, world graph, derive unlocks
    TrainingService.ts       # owns the runner (Inline | Worker strategy), dispatch, snapshots
    EvaluationService.ts     # wraps engine evaluator, baseline caching
    ProgressService.ts       # record results, best stars, gems, cosmetics
    HintService.ts           # hint unlock policy, tier progression
    CodexService.ts          # concept card unlocks and lookup
    ExportService.ts         # progress export/import codes
    AnalyticsService.ts      # the only network egress (cookieless)
    AudioService.ts
  repositories/           # Data access only. No business rules.
    LevelRepository.ts                  # interfaces at the top level (exported from index.ts)
    ProgressRepository.ts
    SettingsRepository.ts
    ConceptRepository.ts · LocaleRepository.ts
    bundled/                            # implementations, one subfolder per source (never exported from index.ts)
      BundledLevelRepository.ts         #   loads per-world JSON chunks (import.meta.glob)
    local-storage/
      LocalStorageProgressRepository.ts
      LocalStorageSettingsRepository.ts
    in-memory/                          #   InMemory* implementations for tests and storage-less mode
    migrations/                         # versioned migrations for persisted data
  models/                 # Domain entities, types and Zod schemas (no logic beyond validation)
    LevelModel.ts        # LevelConfig, Condition, StarRules, WidgetRef
    WorldModel.ts
    ProgressModel.ts
    SettingsModel.ts
    ConceptModel.ts
    CommandModel.ts      # Command, ControlTarget
    SnapshotModel.ts
    EvalResultModel.ts
    SessionModel.ts      # SessionState, SessionTrace
  engine/                 # PURE ML engine. No React, DOM, storage, Date.now(), Math.random().
    math/                 # vectors, matrices, seeded RNG (mulberry32), numeric guards
    data/                 # dataset generators + registry, train/test split, transforms
    ml/
      algorithms/         # ML models: LinearRegression.ts, LogisticRegression.ts…
      optimizers/         # manual, manual-gd, gd, sgd, momentum
    eval/                 # metrics registry, condition DSL, pass + star evaluator
    session/              # level session reducer (state machine)
  workers/                # TrainingWorker.ts + WorkerProtocol.ts (typed message union)
  platform/               # browser adapters: storage availability, PWA update, haptics, feature detection
  config/                 # constants, performance budgets, feature flags, env
  lib/                    # generic helpers with no domain knowledge: crc32, base64url, deflate, assert
  i18n/                   # translation loader + t()
content/
  levels/w1/*.json               # level configs (data only)
  levels/w1/*.solution.json      # scripted solutions (tests only, never bundled)
  concepts/*.md                  # codex cards + debriefs (front-matter + markdown)
  locales/{en,hi}/*.json
tests/
  passbot/                # headless engine-level replays of every solution
  e2e/                    # Playwright: UI wiring smoke per world
```

> **Naming: "model" means two things in this project.** `src/models/` holds **domain models** (Level, Progress, Settings…). **ML models** (linear regression, logistic regression, later neural nets) are called **algorithms** and live in `src/engine/ml/algorithms/`. Never put an ML model in `models/`.

### 4.2 Layer responsibilities

| Layer | Owns | May import | Must NOT |
|---|---|---|---|
| `pages/` | Route screens, layout of a screen, wiring hooks → components | components, hooks, models (types), i18n | Contain business rules, call repositories, call engine |
| `components/` | Rendering, user input, accessibility | other components, models (types), i18n, lib | Import services, stores, repositories or engine. Everything arrives as props. |
| `hooks/` | Adapting services + stores to React (subscriptions, effects, memoization) | services (via `useServices`), stores, models | Contain business rules. They delegate to services. |
| `stores/` | UI-facing reactive state | models, services (types only) | Persist anything themselves, or import repositories |
| `services/` | **All business logic and use cases**, orchestration | repositories (interfaces), engine, workers protocol, platform, models, lib, config | Import React, components, or concrete repository classes (only the composition root does that) |
| `repositories/` | Reading and writing data sources, migrations, schema validation on read | models, lib, platform | Contain business rules (stars, unlocks, hints) |
| `engine/` | Pure ML math, datasets, evaluation, session reducer | models, lib | Import any other `src/` layer, React, browser globals, time, or randomness |
| `models/` | Types, entities, Zod schemas | lib (rarely) | Import anything else |
| `workers/` | Hosting the engine off-thread | engine, models, lib | Import services, stores or React |

**Allowed dependency direction** (enforced in CI with `dependency-cruiser`; rules in `client/.dependency-cruiser.cjs`, run by `pnpm lint:boundaries`):

```
app ──▶ pages ──▶ components
          │  └──▶ hooks ──▶ stores
          │         └─────▶ services ──▶ repositories ──▶ platform
          │                     ├─────▶ engine
          │                     └─────▶ workers (protocol) ──▶ engine
          ▼
   every layer ──▶ models, lib, config, i18n
```

Hard rules:
1. `engine/**` must not import from any other `src/` layer except `models` and `lib`, and must not use React or browser globals. It has to run unchanged in Node (Vitest), in the worker, and on the main thread.
2. `engine/**` must not read time or randomness implicitly. RNG and clocks are **injected**.
3. UI (`pages`, `components`, `hooks`) reaches the engine **only through services**.
4. Services depend on repository **interfaces**, never concrete classes. Only `app/Container.ts` knows concrete implementations. Interfaces sit at the top of `repositories/`, and implementations sit in source subfolders (`local-storage/`, `bundled/`, `in-memory/`), which makes this rule enforceable by path.
5. Solutions (`*.solution.json`) must never be reachable from the app bundle graph.

### 4.3 Dependency injection: the composition root

`app/Container.ts` exposes `createServices(env)`. It is the **only** place that constructs concrete repositories and services:

```
createServices(env)
  repositories: BundledLevelRepository, LocalStorageProgressRepository (→ InMemory if storage unavailable), …
  services:     new LevelService(levelRepo), new ProgressService(progressRepo, levelService),
                new TrainingService(runnerFactory), new EvaluationService(), new HintService(clock), …
```

- The result is provided through `ServicesContext`. Components never read it; hooks read it via `useServices()`.
- Tests call `createServices({ storage: "memory", clock: fakeClock })` or construct a single service with in-memory repositories. We don't need a mocking framework.
- There are no singletons and no module-level mutable state. Every dependency is visible in a constructor.

### 4.4 Naming conventions

**Source files use TitleCase (PascalCase), and a file is named after its main export.** A developer can then find `ProgressService` by typing `ProgressService` in the file finder, and the suffix (`Service`, `Repository`, `Store`, `Model`, `Page`) shows the layer at a glance.

| Kind | File | Export |
|---|---|---|
| Page | `LevelPage.tsx` | `LevelPage` |
| Component | `LossCurve.tsx` | `LossCurve` |
| Hook | `useLevelSession.ts` | `useLevelSession` |
| Store | `ProgressStore.ts` | `useProgressStore` |
| Service | `ProgressService.ts` | `ProgressService` |
| Repository interface / impl | `ProgressRepository.ts` / `LocalStorageProgressRepository.ts` | `ProgressRepository` / `LocalStorageProgressRepository` |
| Domain model | `LevelModel.ts` | `LevelConfig`, `levelConfigSchema` |
| ML algorithm | `LinearRegression.ts` | `linearRegression` (registry entry) |
| Test | next to source: `ProgressService.test.ts` | — |
| Utility / engine function module | `SeededRandom.ts`, `MeanSquaredError.ts` | `createSeededRandom`, `meanSquaredError` |
| Worker | `TrainingWorker.ts`, `WorkerProtocol.ts` | — |

**Exceptions**, where tooling or convention is stronger than our rule:
- **Hooks** keep the `use` prefix in camelCase (`useLevelSession.ts`), because React tooling and every developer expect hook names to start with `use`.
- **Entry and barrel files:** `main.tsx`, `index.ts`.
- **Tool config files:** `vite.config.ts`, `.dependency-cruiser.cjs`, `tsconfig.json`, etc.
- **Folders** are lowercase (`services/`, `ml/algorithms/`).
- **Content data files** use their kebab-case **ids** (`content/levels/w1/w1-l4.json`, `content/concepts/learning-rate.md`), because the file name *is* the id referenced from other configs and URLs.

> macOS and Windows file systems are case-insensitive, and Linux CI is not. Renaming only the case of a file must be done with `git mv` (two steps via a temp name if needed), or CI will break on imports that work locally.

Each folder has an `index.ts` that exports only its public API. Cross-layer imports go through it (`@/services`, `@/models`) via TS path aliases.

### 4.5 Reference implementation: Settings

The Settings feature is the smallest real example of every layer, and the one to copy when building a new feature:

| Layer | File |
|---|---|
| Model | `models/SettingsModel.ts` (Zod schema, types, defaults) |
| Repository | `repositories/SettingsRepository.ts` → `local-storage/LocalStorageSettingsRepository.ts` (versioned `{ v, data }`, backs up corrupt data) · `in-memory/InMemorySettingsRepository.ts` |
| Service | `services/SettingsService.ts` |
| Composition | `app/Container.ts` (falls back to in-memory when storage is blocked) · `app/Bootstrap.ts` (hydrates stores before first render) |
| Store | `stores/SettingsStore.ts` |
| Hooks | `hooks/useSettings.ts` · `hooks/useDocumentPreferences.ts` · `hooks/usePrefersReducedMotion.ts` |
| Components | `components/ui/SegmentedControl.tsx` · `components/ui/Switch.tsx` |
| Page | `pages/SettingsPage.tsx` |

Fonts (Unbounded for display, Atkinson Hyperlegible Next for text) are **self-hosted** via `@fontsource-variable`, so there are no third-party requests and the game works offline.

### 4.6 Request flow example (W1-L4 "Too Fast, Too Slow")

```
1. LevelPage mounts → useLevelSession("w1-l4")
      → LevelService.load("w1-l4") → LevelRepository.get() → Zod-validated LevelConfig
      → TrainingService.start(level)  (picks WorkerRunner: algorithm cost = "worker")
2. Player moves <LearningRateSlider>  → onChange(cmd {hyperparam lr=0.9})
      → useLevelSession.dispatch(cmd) → TrainingService.dispatch(cmd) → worker
3. Player presses Train → worker runs engine GD in time slices → Snapshot per frame
      → TrainingService → session.store → <LossCurve>, <ScatterPlot>, <Mascot> re-render
4. Converged (or Check) → EvaluationService.evaluate(level, trace, snapshot)
      → engine/eval → EvalResult {passed, stars:2, metrics}
5. ProgressService.recordResult(levelId, result)  (applies best-stars + hint cap rules)
      → ProgressRepository.save()  → progress.store updates → <ResultPanel> + <DebriefCard>
      → CodexService.unlock(concept) · AnalyticsService.track("level_pass", {stars})
```

Each step lives in exactly one layer. To find a bug in star scoring, look in `ProgressService` and `engine/eval`, never in a component.

---

## 5. Engine (`src/engine/`)

### 5.1 Numerics & determinism

- **Seeded everything.** Each level declares a `seed`. Dataset generation, train/test split, weight init and SGD shuffling all come from `rng = mulberry32(hash(levelId, seed, purpose))`. Two players, or a player and the pass-bot, see identical data. Without this, the pass-bot is meaningless.
- **Float64 in the engine.** Datasets are small (≤ 500 points in v1), so precision matters more than memory. Snapshots sent to the UI use `Float32Array` over transferables.
- **Divergence is gameplay, not an error.** A too-high learning rate *should* produce `NaN`/`Infinity` (W1-L4). The engine detects non-finite loss, stops the run with `status: "diverged"`, and the UI turns it into a teaching moment ("the ball flew off the map"). Numeric guards clamp only what goes to rendering. They never change the actual math.

### 5.2 Algorithm & optimizer contracts

These types live in `models/` and are implemented in `engine/ml/algorithms/` and `engine/ml/optimizers/`. Parameters are flat `Float64Array`s plus a named layout. That makes them cheap to copy, transfer and diff, and easy for widgets to bind to by name.

```ts
interface Algorithm<TData = void> {  // models/EngineModel.ts: an ML model; "Algorithm" avoids clashing with domain models
  id: string                                   // registry key, e.g. "landscape-2d", "linear-regression"
  paramNames: readonly string[]                // names in vector order, so widgets bind by name (["x","y"], ["w","b"])
  loss(params: Vector, data: TData): number
  gradient(params: Vector, data: TData): Vector
  inDomain(params: Vector): boolean            // false = left the map → the step is "diverged" (gameplay, not an error)
}

// engine/ml/optimizers/GradientDescent.ts: one step, never clamped
gradientDescentStep(algorithm, params, data, learningRate) → { params, loss, gradient, status: 'ok' | 'diverged' }
```

v1 algorithms, all hand-written TS and each under ~150 lines: `linear-regression`, `logistic-regression`, `polynomial-*` (via feature transforms, so not a separate algorithm), and `landscape-2d`. The last one is a synthetic loss surface for W1-L3 and W1-L5, where the "parameters" are the ball's position.

**TF.js (World 4+)** sits behind the same `Algorithm` interface. It's loaded with a dynamic `import()` only when a level's algorithm is tagged `backend: "tfjs"`. In the worker we try `webgl` via `OffscreenCanvas` and fall back to `wasm`, then `cpu`. This is an ADR we'll revisit in v2. Nothing in v1 may depend on TF.js.

### 5.3 Datasets

- Datasets are generated by **registered generators**, which are parameterized and seeded (e.g. `linear-noisy`, `two-blobs`, `moons`, `circles`, `imbalanced-blobs`, `with-outliers`). A level can reference `"linear-noisy-50"` or `{ generator, params }`.
- The generator always returns `{ train, test }`. `test` is the **hidden test set** (D6). It stays inside `TrainingService` and the worker. The UI only receives derived metrics such as `test_accuracy`, and only after evaluation. The one exception is a post-judgement reveal (D6): a runner may put the test points it has just judged into the snapshot so the player can see *where* the model failed, and clears them on the next change.
- *Honesty note:* on a static site nothing is truly hidden from someone who opens DevTools. The hidden set is pedagogical, not anti-cheat, and we don't spend effort obfuscating it.
- Transforms (`standardize`, `polynomial(d)`, `remove(ids)`, `reweight(class, w)`) are pure functions. The player's data edits become a transform pipeline recorded in the session, not a mutated array.

### 5.4 Evaluation: metrics, conditions, stars

The evaluator is a **pure function** in `engine/eval/` and the only authority on pass/fail. The app calls it only through `EvaluationService`:

```ts
evaluate(level: LevelConfig, trace: SessionTrace, snapshot: ModelSnapshot, data: {train, test})
  → { passed: boolean; stars: 0|1|2|3; metrics: Record<string, number>; failedConditions: Explain[] }
```

- **Metric registry.** Each metric has an id, a direction (lower/higher is better), a split it can apply to (`train | test | session`) and a pure implementation: `mse`, `accuracy`, `precision`, `recall`, `f1`, `min_class_prob`, `train_test_gap`, `epochs_to_converge`, `steps`, `moves`, `hints_used`, `distance_to_global_min`, `speedup_vs_baseline`, and more.
- **Condition DSL**, declarative only:
  `{ "metric": "accuracy", "split": "test", "op": ">=", "value": 0.85 }`, composable with `{ "all": [...] }` and `{ "any": [...] }`.
- **Stars** are three condition sets (`pass`, `two`, `three`) plus a global rule: *hints used ⇒ max 2 stars* (PRD).
- `failedConditions` returns structured explanations, so the result screen can say *which* condition missed and by how much. The first hint tier uses this too.
- **Baselines.** Some conditions are relative (W1-L7: "3× faster than unscaled"). The evaluator runs the baseline configuration headlessly with the same seed and caches the result per level. Nothing in the level config is hard-coded.

> **The PRD's config sketch will change.** The sketch uses ad-hoc keys like `"max_epochs"`, `"test_mse_max"`. We normalize these into the condition DSL so there's **one** way to express a condition. Contributors get a JSON Schema with autocomplete.

### 5.5 Level config & validation

- The format is **JSON only**, with no TS or functions in level files. This keeps contributions safe to review, diffable, and loadable at runtime per world chunk.
- The schema is defined once in **Zod** (`models/LevelModel.ts`). `LevelRepository` validates on read. From that we generate:
  1. runtime validation on load (dev: throw; prod: show a "level failed to load" card and report the event),
  2. `level.schema.json` for editor autocomplete (`"$schema"` key in every level),
  3. TS types for the engine.
- **Cross-registry validation** in CI checks that every referenced dataset, model, widget, metric, concept id and locale key exists, and that each widget's control target is valid for the chosen model.
- **Versioning:** each config has `"schemaVersion"`. Breaking schema changes ship with a codemod script that migrates every file in `content/levels`.

### 5.6 Level session state machine

The level lifecycle is an explicit, typed reducer in `engine/session/`. `useLevelSession` drives it through the services. It's pure and runs in tests. We use a hand-rolled reducer instead of XState to keep the bundle and the learning curve small.

```
 briefing ──start──▶ playing ◀──────────── retry ─────────────┐
                      │   ▲                                    │
                 train│   │stop/diverged/converged             │
                      ▼   │                                    │
                    training                                   │
                      │ (auto-check on converge / explicit Check)
                      ▼                                        │
                  evaluating ──fail──▶ failed (hint unlocked) ─┘
                      │pass
                      ▼
                    passed ──▶ debrief ──▶ (next level | map)
```

- **Hint unlock** is a reducer concern. It triggers on `failed`, or when `session.idleMs ≥ 60_000` with no metric improvement. `HintService` injects the clock tick, so tests control time.
- The `SessionTrace` (commands + timestamps + evaluation results) is kept in memory. A redacted version can be attached to bug reports.

---

## 6. Training: running models without janking the UI

### 6.0 As built (v1): one `LevelRunner` per algorithm family

`services/training/LevelRunner.ts` is the contract `PlaySession` depends on: `scene` (static drawing data, **never the hidden test set**), `snapshot`, `apply(command)`, and `judge(command, session)`, which returns the evaluator's result when the attempt should end. `TrainingService.createRunner(level)` switches on `level.algorithm.id`, with an exhaustive `switch` and `assertNever`:

| Algorithm | Runner | Scene / snapshot | Ends when |
|---|---|---|---|
| `landscape-2d` + `manual-steps` optimizer (W1-L3) | `LandscapeRunner` | contour map (cached per level) / ball, trail, preview | the ball reaches the valley, leaves the map, or the steps run out |
| `landscape-2d` + `auto-descent` optimizer (W1-L5) | `DescentRunner` | contour map / the start, then the recorded roll | every roll is judged: deepest valley or a local minimum |
| `linear-regression` + `manual` optimizer (W1-L1, W1-L2) | `RegressionRunner` | training points only / `w`, `b`, loss, best loss, moves | the player presses Check, or the move budget runs out |
| `linear-regression` + `gradient-descent` optimizer (W1-L4; W1-L8 boss adds `allowCleaning` + `allowScaling`) | `GradientDescentRunner` | training points, learning-rate range, target loss / the recorded run, epoch by epoch | every Train press is judged: converged, too slow, or diverged |
| `linear-regression` + `least-squares` optimizer (W1-L6) | `CleaningRunner` | all training points, unmarked (which ones are outliers is ground truth kept in the runner) / removed points + the exact refit | the player presses Check; scored on the hidden, clean test set |
| `multi-linear-regression` (W1-L7) | `ScalingRunner` | feature ranges raw/scaled, and the baseline: the fastest convergence ANY learning rate reaches without scaling (engine `searchLearningRate`) / the latest run and whether it was scaled | every Train press is judged by `speedup` = baseline epochs ÷ your epochs |
| `logistic-regression` + `manual-boundary` (W2-L1) | `BoundaryRunner` | labelled training points only / the border's two handles, which side is class 1, live correct count | the player presses Check; accuracy on training points, hidden test accuracy for the third star |
| `logistic-regression` + `manual-sigmoid` (W2-L2) | `SigmoidRunner` | 1D labelled points, slider ranges / slope, threshold, each point's confidence for its true class | the player presses Check; min confidence on training points, hidden log loss (overconfidence) for stars 2–3 |
| `logistic-regression` + `feature-builder` (W2-L3) | `FeatureRunner` | labelled points, offered features / chosen features, then decision regions (60×48 grid) + border (engine `contourLines` at score 0) | every Train press is judged: accuracy, hidden accuracy, feature count |
| `logistic-regression` + `complexity` (W2-L4) | `ComplexityRunner` | labelled training points, degree range / degree, then regions + border of a degree-d polynomial model (standardized terms, gradient descent); after a Check, the hidden points just judged (D6 reveal) | only Check is judged (trains first if needed): train accuracy, hidden accuracy, attempt |
| `logistic-regression` + `complexity` with fixed `degree` + `regularization` (W2-L5) | `ComplexityRunner` | same scene with no degree slider and an L2-strength slider (engine `withL2Penalty`) | only Check is judged: train and hidden accuracy, `accuracy_gap` = \|train − hidden\|, attempt |

**Training runs are computed inline and replayed.** The Web Worker (§6.2) isn't used yet, on purpose. ARCHITECTURE's rule is to choose the runner by cost, and full-batch gradient descent on ≤ 500 points for ≤ 500 epochs takes microseconds, so a worker round-trip would only add latency and a harder-to-test path. `trainGradientDescent` records every epoch, and the UI replays it with `usePlayback`, which is time-based (`requestAnimationFrame` + elapsed time): throttled frames skip ahead, a hidden tab pauses and then catches up, and reduced motion shows the finished run. The WorkerRunner arrives with the first level whose training takes more than about one frame (World 4 neural networks) (ADR-0004).

To add an algorithm family: add a variant to `levelAlgorithmSchema`, a runner, a `case` in `TrainingService`, a scene/snapshot variant, and a level view in `pages/level/`. The compiler points at every place that needs it.

### 6.1 `TrainingService` and its two runner strategies

`TrainingService` is the app's only entry point for running an algorithm. Internally it uses a `ModelRunner` strategy (`services/training/`). The rest of the app never sees which one is active.

```ts
interface ModelRunner {
  load(level, seed): Promise<void>;
  dispatch(cmd: Command): void;          // param edits, hyperparams, data ops, train/step/stop
  subscribe(fn: (s: Snapshot) => void): Unsubscribe;
  evaluate(): Promise<EvalResult>;
  dispose(): void;
}
```

- **InlineRunner** runs on the main thread, synchronously. It's for levels where each interaction is a single cheap evaluation: dragging a line recomputes MSE on 50 points in microseconds. Adding a worker round-trip here makes dragging *feel* worse.
- **WorkerRunner** is used for anything that loops (Train buttons, baselines, polynomial fits, everything in World 4+).
- The runner is chosen by the model's registry metadata (`cost: "inline" | "worker"`), not by level authors. Both runners wrap the same `engine`, so behaviour is identical. A test runs a sample of levels through both and diffs the results.

### 6.2 Training loop & frame budget

- The worker trains in **time-sliced chunks**: it runs steps for ~8 ms, then yields (`setTimeout(0)` / `MessageChannel`) so `stop` and hyperparameter commands are handled promptly.
- It posts a **snapshot at most once per animation frame** (~16 ms): params, loss history delta, current metrics, and the decision-boundary grid when it's dirty. The main thread keeps only the **latest** snapshot. `requestAnimationFrame` renders it, and intermediate snapshots are dropped, never queued.
- Large arrays (boundary grids, predictions) are sent as **transferable** `Float32Array`s.
- **Pacing for pedagogy:** some levels *want* slow, visible training. The level can set `stepsPerSecond`. The engine throttles steps for display and can still compute the full run headlessly for evaluation.
- **Adaptive quality:** if frame time exceeds budget for 1 s, the viz layer lowers the boundary grid resolution (e.g. 100² → 50²) before it drops frames. The fps target is 30+ on a mid-range phone (D5).

### 6.3 Worker protocol

- It's a discriminated union of messages, with the shared type in `workers/WorkerProtocol.ts`. Every message carries `sessionId`, so stale snapshots from a previous level or retry are ignored.
- Worker code compiles against its own `tsconfig.worker.json` (`lib: WebWorker`), and `src/workers` is excluded from the app tsconfig (`lib: DOM`). Mixing the two libs lets worker-only APIs typecheck in UI code and causes conflicting global types.
- We don't use Comlink. The protocol is small, and explicit messages are easier to log, replay and test.
- **Crash handling:** if the worker errors or hangs past a watchdog (5 s without a heartbeat while training), the runner terminates it, spawns a fresh one, replays the session trace, and shows a non-blocking toast. If replay also fails, the runner falls back to InlineRunner with reduced step rate.

---

## 7. UI & rendering

| Surface | Tech | Why |
|---|---|---|
| Scatter, fitted line, loss curve, confusion matrix | **SVG** (React-rendered) | ≤ 500 elements, crisp, stylable with theme tokens, **accessible** (ARIA labels and descriptions) |
| Decision-boundary heatmap, loss landscape contours | **Canvas 2D** | Per-pixel fills. SVG would create thousands of nodes. |
| World map, mascot, particles on pass | **PixiJS**, lazy-loaded chunk | Game feel at 60 fps. Kept out of the level-play critical path. |

- **Viz components are pure views of a snapshot.** They receive `(snapshot, theme, size)` and never own training state. That makes them trivially testable with fixture snapshots and reusable in Sandbox mode.
- **Widgets** implement one interface: `{ id, targets: ControlTarget[], render(props) }`. Each widget must support pointer, touch and keyboard input, and expose an accessible name and value text (F9, F12). Dragging uses Pointer Events with `touch-action: none` on the plot only, never the whole page.
- **The mascot ("the Learner")** is driven by a single normalized `progress ∈ [0,1]` derived from the level's primary metric. It doesn't know any ML.
- **Theming** uses CSS custom properties for light/dark. Viz reads tokens, so colours stay consistent between SVG and Canvas. Categorical colours are checked for colour-blind safety, and class markers also differ by **shape**, not colour alone.
- **Reduced motion:** `prefers-reduced-motion` plus the in-game setting disables particles, eases animations, and switches training playback to stepped updates.

### Routing

We use **hash routing** (`/#/w1/l4`). It works on GitHub Pages without the `404.html` redirect hack and needs no server rewrites. The trade-off is uglier URLs, which is acceptable for a game. Routes: `/`, `/map`, `/w/:world/l/:level`, `/codex`, `/sandbox`, `/settings`, `/import`.

---

## 8. State & persistence

### 8.1 Stores, services and repositories

Persistence is split across three layers. **Repositories** read and write storage and run migrations. **Services** apply the business rules (best stars, hint cap, unlocks). **Stores** hold the reactive copy the UI renders. Stores never touch `localStorage` directly.

| Store | Persisted by | Contents |
|---|---|---|
| `progress` | `LocalStorageProgressRepository` → `localStorage["mlq:progress"]` | per-level best stars, completed flag, hints used, codex unlocks, gems, cosmetics |
| `settings` | `LocalStorageSettingsRepository` → `localStorage["mlq:settings"]` | theme, sound, reduced motion, locale, analytics opt-out |
| `session` | not persisted | current level session (mirrors reducer state for React) |

- The **unlock state is derived, not stored**. `LevelService` computes world and level locks from `progress` plus the static world graph. That way a content update (a new level inserted) can't leave a save in an impossible state.
- **Schema versioning:** each persisted blob is `{ v: number, data }`. On load the repository runs a migration chain (`repositories/migrations/`, `migrations[v] → v+1`), then Zod validation. If validation fails, we keep the old blob under `mlq:progress:corrupt:<ts>` and start fresh. **Player progress is never silently deleted.**
- **One helper for every stored document:** `repositories/local-storage/VersionedStore.ts` implements the `{ v, data }` envelope, fills missing fields from defaults, backs up unreadable data, and reports write failures. Settings and Progress repositories are thin wrappers around it.
- **Cross-tab safety:** we listen to `storage` events and re-hydrate, so two open tabs don't overwrite each other.

### 8.2 Export / import code (F8), handled by `ExportService`

`code = "MLQ1-" + base64url(deflate(JSON(progress))) + "-" + crc32`

- The version prefix allows format changes later, and the checksum catches copy-paste truncation.
- Import runs the same migration and validation path as load. Before overwriting, it shows a **diff preview** ("This code has 18 stars; you currently have 22").
- Deflate uses the native `CompressionStream` where available, with a tiny fallback. The target is under ~200 characters for a full v1 save.

---

## 9. Content pipeline

- **Levels:** `content/levels/<world>/<id>.json`, bundled **per world** as a lazy chunk via `import.meta.glob`. Playing World 1 never downloads World 2.
- **Concept cards and debriefs:** markdown with front-matter (`id`, `title`, `oneLiner`, `visual`, `formula?`). They're compiled at build time to JSON (no runtime markdown parser). Formulas use KaTeX, rendered at build time to HTML, so KaTeX JS isn't shipped.
- **Strings:** all player-facing text in levels is a **locale key**, never a literal. A string like `"w1.l4.mission"` resolves through `content/locales/<lang>/`. Hindi is a "Could" item, but externalizing strings from day one is cheap. Retrofitting later means touching every level.
- **Credits:** `"authors": ["github-handle"]` in the level config is rendered on the debrief card (PRD: contributors credited).

---

## 10. Testing strategy

| Layer | Tool | What it proves | Runs |
|---|---|---|---|
| Engine math & algorithms | Vitest | Gradients match finite differences (gradient check on every algorithm); losses and metrics match reference values | every PR |
| Evaluator | Vitest | Condition DSL, star rules, hint star-cap, baseline-relative metrics | every PR |
| Services | Vitest + in-memory repositories | Business rules: best-stars, hint cap, unlock derivation, export round-trip, migrations | every PR |
| Components | Vitest + Testing Library | Widgets emit correct commands; viz renders fixture snapshots; a11y labels | every PR |
| Level validation | Vitest + Zod | Every config parses and cross-references resolve | every PR |
| **Pass-bot (engine)** | Vitest (Node) | Each level's `*.solution.json` replayed through `engine` yields **≥ 1 star**, and ideally a 3-star solution too | every PR |
| **Anti-solutions** | Vitest | The "obvious wrong move" (e.g. max complexity in The Overfitter, LR = 10 in Too Fast) does **not** get 3 stars. This guards the misconception traps. | every PR |
| Runner parity | Vitest | InlineRunner and WorkerRunner (via worker shim) produce identical metrics for sample levels | every PR |
| UI wiring | Playwright | For one level per widget type: load → perform solution via real pointer/keyboard → pass screen | every PR (Chromium), nightly (WebKit, mobile viewport) |
| Accessibility | axe (Playwright) | No critical violations on map, level, codex | every PR |
| Performance | Lighthouse CI + bundle budget | Lighthouse ≥ 90, initial JS within budget | `main` |

**Vitest projects** (`client/vitest.config.ts`): **`node`** runs every test outside the UI layers, including `tests/` (pass-bot), in plain Node. That proves engine, service and repository code has no hidden DOM dependency. **`dom`** runs `app/`, `pages/`, `components/` and `hooks/` tests in jsdom with Testing Library and jest-dom (`tests/setup/DomSetup.ts`). Coverage uses v8 and excludes barrels. Coverage thresholds get introduced per layer once each layer has real code.

The PRD says "Playwright pass-bot". We split it deliberately. **Winnability is proven at the engine level**: that's fast, deterministic, and covers all 16 levels in seconds. **Playwright proves the UI can express the solution.** Running all 16 levels through a browser on every PR would be slow and flaky, and it wouldn't prove anything more.

---

## 11. Build, deploy & CI

**Pipeline (GitHub Actions)**

```
PR:    install → typecheck → lint (oxlint + dependency-cruiser) → unit → level-validate → pass-bot
       → build → bundle-size check → Playwright (Chromium) + axe
main:  all of the above → Lighthouse CI → deploy to GitHub Pages
nightly: Playwright WebKit + mobile viewports
```

- **Runtime:** Node 24 LTS (`.nvmrc` at the repo root; `engines.node >= 22`, the minimum dependency-cruiser supports).
- **Tooling:** Vite + React + TypeScript (`strict`), pnpm, oxlint + Prettier, dependency-cruiser, Vitest, Playwright, `vite-plugin-pwa` (Workbox). All commands run inside `client/`, and the workflow sets `working-directory: client`.
- **Repo:** [github.com/amide-init/ml-quest](https://github.com/amide-init/ml-quest). **Live URL:** `https://amide-init.github.io/ml-quest/`.
- **Base path:** `vite.config.base = "/ml-quest/"` for GitHub Pages, set from an env var in the deploy workflow so local dev stays at `/`. It moves to `/` if we add a custom domain. If the repo is renamed, update this value too.
- **PWA:** precache the app shell and World 1 on first visit, and runtime-cache later world chunks on first play. The update strategy is **prompt, never auto-reload**. A new version is applied on the map screen and never mid-level.
- **Performance budgets** (fail CI if exceeded):

  | Asset | Budget (gzip) |
  |---|---|
  | Initial JS (shell + map, no Pixi) | 170 KB |
  | Per-world level chunk | 40 KB |
  | Worker bundle (v1 models) | 25 KB |
  | PixiJS chunk (lazy) | loaded after first paint |
  | TF.js | **0 in v1** |

---

## 12. Cross-cutting concerns

**Privacy & analytics.** `AnalyticsService` is the **only** place that may send network requests after load. It is cookieless (GoatCounter or Plausible), sends no identifiers, is disabled in dev and when DNT or opt-out is set, and uses a fixed event vocabulary: `level_start`, `level_pass{stars}`, `level_fail`, `hint_used{tier}`, `world_complete`. These map directly to the PRD success metrics. Adding a new event requires an update to this doc.

**Accessibility.** WCAG 2.1 AA target: full keyboard play, visible focus, and screen-reader text for plots (a "data table" alternative and live-region metric announcements, throttled to 1/s). Colour is never the only signal.

**Error handling.**
- Every route has a React error boundary. Inside a level, the fallback offers "Restart level" and keeps progress.
- Level config failures, worker crashes and storage quota errors are shown as friendly cards and logged to the console. They're **not** sent anywhere (no backend).
- Storage unavailable (private mode) → the game plays in memory with a banner suggesting export codes.

**Security.** There's no backend, no auth and no user-generated content at runtime, so the attack surface is small. Level files are data-only, so a malicious PR can't ship executable level logic. We set a CSP meta tag (`script-src 'self'`, plus the analytics origin), audit dependencies with Dependabot, and keep the dependency list short.

**Internationalization.** See §9. RTL isn't planned, but layout uses logical CSS properties so it isn't blocked.

---

## 13. Extensibility guide (how the system grows)

| I want to add… | Touch | Engine change? |
|---|---|---|
| A new screen | `pages/XxxPage.tsx` + route in `app/Router.tsx` + hook if it needs data | No |
| A new business rule (e.g. streaks) | method on the owning service + tests with in-memory repositories | No |
| A new persisted field | `models/*.model.ts` + version bump + migration in `repositories/migrations/` | No |
| A new level using existing pieces | `content/levels/*.json` + solution + locale strings + concept card | **No** |
| A new dataset shape | `engine/data/generators/*` + register | Small, isolated |
| A new metric | `engine/eval/metrics/*` + register + tests | Small, isolated |
| A new widget | `components/widgets/*` + control target in `models/CommandModel.ts` (if new) + a11y + Playwright case | Medium |
| A new algorithm family (trees, W3) | `engine/ml/algorithms/*` implementing `Algorithm` + `describe()` + new `components/viz/*` | Medium |
| Neural nets (W4+) | TF.js adapter behind `Algorithm`, `backend: "tfjs"`, worker backend selection | Large → needs ADR |
| Heavy precomputed assets (W5–6) | `scripts/precompute/*` + CI job → `public/assets/` (see §17.2) | No |
| An online feature (v2+) | `Api*Repository` / new service + feature flag, per §17.4 | No (engine untouched) → needs ADR |

---

## 14. Architecture Decision Records

We keep ADRs in `docs/adr/NNNN-title.md`. Seed decisions from this document:

| ADR | Decision | Status |
|---|---|---|
| 0001 | Pure, deterministic `engine` with injected RNG/clock; enforced by dependency-cruiser | Accepted |
| 0002 | Levels are JSON data referencing registries; no code in level files | Accepted |
| 0003 | Single condition DSL for pass and stars (normalizes PRD sketch) | Accepted |
| 0004 | Dual runner (Inline + Worker) behind one contract | Accepted |
| 0005 | Winnability proven by engine-level pass-bot; Playwright for wiring only | Accepted |
| 0006 | Hash routing on GitHub Pages | Accepted |
| 0007 | Versioned local persistence with migrations; unlocks derived not stored | Accepted |
| 0008 | Strings externalized from day one | Accepted |
| 0009 | TF.js backend strategy in workers (webgl/OffscreenCanvas → wasm → cpu) | **Deferred to v2** |
| 0010 | PixiJS vs pure Canvas for world map (revisit if bundle budget is tight) | Proposed |
| 0011 | Layered architecture (pages → components/hooks → stores → services → repositories/engine → models) with a DI composition root | Accepted |
| 0012 | ML models named "algorithms" (`engine/ml/algorithms`); `models/` reserved for domain entities | Accepted |
| 0013 | Compute ladder: browser → build-time precompute → optional serverless; the game never *requires* a backend | Accepted (applies from v2) |
| 0014 | Choice of optional backend provider (Supabase vs Cloudflare Workers + D1) | **Deferred until the first online feature is scheduled** |

---

## 15. Phase mapping (PRD roadmap → architecture work)

| Phase | Architecture deliverables |
|---|---|
| 0. Prototype (W1-L3) | Folder skeleton + lint boundaries, `engine/math`, `landscape-2d` algorithm, `manual-gd` optimizer, `TrainingService` with InlineRunner, `LevelPage` with one Canvas viz, bare session reducer. **Page styling can be throwaway. The layers and `engine` are not.** |
| 1. Engine | `models/` schemas + JSON Schema, registries, evaluator + DSL, WorkerRunner + protocol, repositories + migrations, core services + DI container, stores/hooks, pass-bot harness, CI pipeline |
| 2. World 1 | All W1 generators/metrics/widgets, solutions + anti-solutions, world map, codex pipeline |
| 3. World 2 + polish | Logistic/poly features, boundary heatmap + adaptive quality, PWA, a11y audit, Lighthouse gate |
| 4. Launch | Budgets locked, contributor docs (`CONTRIBUTING.md`, "Create a level"), issue templates |

---

## 16. Risks & open technical questions

| Risk / question | Mitigation / next step |
|---|---|
| Worker round-trip makes drag interactions feel laggy | InlineRunner for cheap models (§6.1); measure input-to-paint < 16 ms in prototype |
| Mid-range Android can't hold 30 fps with heatmap + Pixi | Adaptive grid resolution; Pixi never on the level screen during training; test on real device in Phase 3 |
| Condition DSL too weak for a future level | Add a metric (code, reviewed) rather than logic in config; DSL stays declarative |
| Save format churn during development | Migrations from day one; fixture saves of every version in tests |
| Visual style undecided (pixel vs flat), per PRD open question | Theme tokens + viz as pure views keep this a skin change, not a refactor |
| TF.js in workers varies across browsers | Deferred (ADR-0009); spike before starting World 4 |
| W5–6 levels too heavy for phones | Precompute in CI + pretrained tiny models + compute budgets (§17) |
| Optional backend becomes a hard dependency over time | Offline-first rule and feature flags (§17.4); CI runs the full pass-bot and e2e suite with no backend configured |

---

## 17. Future (v2+): compute strategy & optional backend

> **Not v1 scope.** v1 ships as a pure static site (§11). This section decides *in advance* how heavier worlds (3–6) and possible online features fit without breaking the free, offline, no-backend promise, so no one invents an ad-hoc answer later.

### 17.1 The compute ladder

Every compute need goes to the **lowest rung that works**. Moving up a rung requires an ADR.

| Rung | Where it runs | Cost | Use for |
|---|---|---|---|
| **1. Player's browser** (default) | `engine/` in the Web Worker. Hand-written TS algorithms, TF.js with WebGPU → WebGL → WASM → CPU fallback. | Free, private, offline | Everything interactive: training, evaluation, visualization |
| **2. Build-time precompute** | GitHub Actions job at build time; outputs ship as static files | Free (public-repo Actions) | Anything heavy that isn't interactive: pretrained weights, embeddings, dense loss landscapes, baseline runs |
| **3. Optional serverless** | Free-tier serverless (see §17.3) | Free tier, capped | Only what *can't* be static: shared state (leaderboards, cloud save) or hidden secrets (LLM API keys) |

**Never:** a server that trains models for players at request time. It's costly, hard to scale for a free project, breaks offline play, and contradicts the PRD non-goal "no training of large models".

### 17.2 Rung 2: precomputed assets

- Scripts live in `scripts/precompute/<asset>.ts` (or Python in `scripts/precompute/py/` if a reference implementation needs it). They're deterministic, seeded, and versioned.
- A CI job runs them only when their inputs change (cache key = script hash + seed) and writes to `public/assets/precomputed/<asset>@<hash>.{bin,json}`.
- Each asset has a manifest entry `{ id, hash, bytes, producedBy }`. `AssetRepository` loads by id and verifies the hash, and the service worker caches assets per world.
- **Size budget:** ≤ 2 MB per world of precomputed assets, gzip. Weights are quantized to float16 or int8 where accuracy allows.
- Level configs reference assets by id (`"init": { "weights": "asset:w5-mini-cnn" }`), never by URL.

**Planned uses:**

| World | Heavy part | How it stays in the browser |
|---|---|---|
| 3. Forest of Trees | Random forest with many trees | Cap at ≤ 50 trees on ≤ 500 points; runs in the worker in milliseconds |
| 4. Neuron City | MLP training, backprop visualization | TF.js in the worker; ≤ ~10k params; lazy-loaded TF.js chunk |
| 5. Vision Tower | CNN on images | 28×28 grayscale data, a pretrained tiny CNN shipped as an asset; the player trains or tweaks only the last layers or filters |
| 6. Attention Citadel | Embeddings, attention | Precomputed small embedding table + a tiny single-head attention model (≤ 50k params) whose weights the player inspects and nudges |

### 17.3 Rung 3: optional backend (only if an online feature is approved)

| Candidate feature | Why it needs a server | Preferred free option |
|---|---|---|
| Accounts + cloud save across devices | Central storage | Supabase (Postgres + auth, free tier) |
| Leaderboards / class rooms for teachers | Shared state between players | Supabase, or Cloudflare Workers + D1 |
| AI tutor (LLM-written hints) | API key can't be shipped in a static bundle | Cloudflare Worker proxy with rate limiting, or players bring their own key (stored locally, never sent to us) |
| Training on a player's own large dataset | Too heavy for phones | Not hosted: an "Open in Google Colab" notebook link, or a Hugging Face Space maintained separately |

Provider choice is **deferred** (ADR-0014). Pick it when the first feature is actually scheduled, based on the free-tier limits at that time.

### 17.4 Integration rules (non-negotiable if a backend is added)

1. **Offline-first.** The full game, all worlds, and progress keep working with no network and no backend configured. Online features are *additions*, never gates. Passing a level never requires the network.
2. **Behind the existing layers.** A backend enters only as a new repository implementation (`ApiProgressRepository` next to `LocalStorageProgressRepository`, with a sync strategy) or a new service (`LeaderboardService`, `TutorService`). It's wired in `app/Container.ts`. Pages, components and `engine/` don't change.
3. **Feature-flagged.** Each online feature has a flag in `config/` and an env var (e.g. `VITE_SUPABASE_URL`). When the flag is off, the UI hides the feature entirely instead of showing errors.
4. **Local stays the source of truth** for progress. Cloud save syncs *from* local (last-write-wins per level on `bestStars`, so it only goes up), and never deletes local data.
5. **Privacy stays opt-in.** No account is ever required to play. Collecting any personal data needs a privacy note in the README and an update to PRD non-goals.
6. **Forks keep working.** A fork with no backend credentials deploys and plays exactly like v1. CI runs the full pass-bot and e2e suite with no backend configured.
7. **Backend code lives separately** in `server/` (or a separate repo), with its own deploy workflow. The static site's deploy must never depend on it.

### 17.5 Triggers to revisit

Revisit this section, and write the relevant ADR, when any of these happens:
- a World 4+ level can't hold 30 fps on the reference phone after applying §17.2;
- the precomputed assets for one world exceed the 2 MB budget;
- an online feature (cloud save, leaderboards, tutor) is added to the roadmap;
- the hosting provider's free-tier terms change in a way that affects the project.

