# ML Quest — Engineering Rules

These rules apply to every change: code, level content, docs. They're here so the promises in [PRD.md](./PRD.md) and the design in [ARCHITECTURE.md](./ARCHITECTURE.md) survive contact with real work. If a rule blocks something good, change the rule in a PR. Don't quietly break it.

**MUST** = CI or review will block. **SHOULD** = strong default; explain in the PR if you deviate.

---

## 1. Product rules (non-negotiable)

1. **MUST** — A level is passed only by the evaluator (`engine/eval`, via `EvaluationService`) running on real model output. There's no UI-only pass path, no "skip level" button, and no dev shortcut that ships to production.
2. **MUST** — Every level has a hidden test set. Memorizing training data must never earn 3 stars.
3. **MUST** — Using a hint caps stars at 2 and never blocks passing. Failing never costs anything except time.
4. **MUST** — No formula is required to pass any level. Math lives only in "go deeper" cards.
5. **MUST** — No accounts, cookies, personal data, or backend calls, other than the single cookieless analytics wrapper.
6. **MUST** — v1 scope is frozen at Worlds 1–2 (16 levels). Work on later worlds goes behind a flag on a branch, not into `main`.

## 2. Architecture rules

1. **MUST** — Follow the layered structure in ARCHITECTURE §4. Each piece of code lives in exactly one layer:
   | Code that… | Goes in |
   |---|---|
   | is a whole screen / route | `pages/` |
   | renders UI or takes input | `components/` (`ui`, `widgets`, `viz`, `game`) |
   | connects React to services/stores | `hooks/` |
   | holds reactive UI state | `stores/` |
   | makes a business decision or orchestrates a use case | `services/` |
   | reads or writes storage or bundled data | `repositories/` |
   | defines a type, entity or Zod schema | `models/` |
   | is ML math, datasets, metrics, evaluation | `engine/` |
2. **MUST** — Dependencies only point down: `pages → components/hooks → stores → services → repositories/engine → models`. `dependency-cruiser` enforces this in CI.
3. **MUST** — **Pages** contain no business logic. They compose components and call hooks.
4. **MUST** — **Components** are presentational. Data arrives as props and events leave as callbacks. They never import services, stores, repositories or engine.
5. **MUST** — **Services** hold all business rules (stars, hint cap, unlocks, export). They're plain TS classes with constructor-injected dependencies, and they never import React.
6. **MUST** — **Repositories** only read and write data, run migrations and validate with Zod. They contain no business rules. Every repository has an interface plus an `InMemory*` implementation for tests.
7. **MUST** — Services depend on repository **interfaces**. Only `app/Container.ts` constructs concrete classes. No singletons and no module-level mutable state.
8. **MUST** — `client/src/engine/**` is pure TypeScript: no React, DOM, `window`, `localStorage`, `fetch`, timers, `performance`, `Date.now()`/`new Date()`, or `Math.random()`. RNG and clocks are injected. It imports only `models/` and `lib/`. This is enforced by oxlint (globals, `Math.random`, `Date.now`) and dependency-cruiser (imports); `new Date()` is checked in review.
9. **MUST** — `models/` holds **domain** models. ML models are called **algorithms** and live in `engine/ml/algorithms/`.
10. **MUST** — Everything random is seeded (datasets, splits, init, shuffles). The same level and seed always give the same result.
11. **MUST** — Widgets emit **commands**, and viz components render **snapshots**. Only `TrainingService` talks to runners and workers.
12. **MUST** — Divergence (`NaN`/`Infinity`) is a game state (`status: "diverged"`), not an exception. Don't "fix" it by clamping the math.
13. **MUST NOT** — Ship TensorFlow.js, or any dependency over 20 KB gzip, in the v1 bundle without an ADR.
14. **SHOULD** — One service per domain capability. If a service passes ~300 lines or has two unrelated reasons to change, split it.
15. **SHOULD** — Prefer adding to a registry (dataset, metric, widget, algorithm) over adding a special case to a service.
16. **SHOULD** — Record every significant or hard-to-reverse decision as an ADR in `docs/adr/`.

## 3. Level content rules

1. **MUST** — Level files are **JSON data only**: `content/levels/<world>/<id>.json` with a `"$schema"` and `"schemaVersion"`. They contain no code, functions or expressions beyond the condition DSL.
2. **MUST** — Every level has a `*.solution.json` that the pass-bot replays to reach at least 1 star. Levels with a misconception trap also ship an **anti-solution** that must *not* reach 3 stars.
3. **MUST** — All player-facing text is a locale key (`w1.l4.mission`), never a literal string in the level file.
4. **MUST** — Each level has: mission (≤ 25 words, readable in about 10 s), 3 hint tiers (nudge → concept → near-solution), a 2–3 sentence debrief that names the ML term, and a linked concept card.
5. **MUST** — Keep datasets small: ≤ 500 train points in v1, so training holds 30 fps on a mid-range phone.
6. **SHOULD** — The mission is in game language ("get the ball into the valley"), and the debrief is in ML language ("that was gradient descent"). Play first, name it after.
7. **SHOULD** — Each level teaches **one** new idea. Boss levels combine ideas and introduce nothing new.
8. **SHOULD** — Credit authors in `"authors"` so they appear on the debrief card.

## 4. Code style

1. **MUST** — TypeScript `strict`. No `any` (use `unknown` and narrow), no `@ts-ignore` (use `@ts-expect-error` with a reason), and no non-null `!` in `engine` or `services`.
2. **MUST** — oxlint + Prettier pass with zero warnings.
3. **MUST** — Validate every external input with Zod at the boundary: level JSON, localStorage, import codes, worker messages.
4. **SHOULD** — Use discriminated unions for commands, messages and states, with exhaustive `switch` and a `never` check.
5. **SHOULD** — The engine uses pure functions and plain data. Services and repositories are classes, because they need injected dependencies. Nothing else should be a class.
6. **MUST** — Source files use **TitleCase**, named after their main export (ARCHITECTURE §4.4):
   `LevelPage.tsx` · `LossCurve.tsx` · `ProgressStore.ts` · `ProgressService.ts` · `ProgressRepository.ts` (interface) + `LocalStorageProgressRepository.ts` (implementation) · `LevelModel.ts` · `LinearRegression.ts` · `ProgressService.test.ts`.
   Exceptions: hooks keep camelCase `useXxx.ts`; `main.tsx` and `index.ts`; tool config files; lowercase folders; content data files are named by their kebab-case id (`w1-l4.json`). Registry ids stay `kebab-case`.
7. **MUST** — Each layer folder exports its public API through `index.ts`. Import across layers via path aliases (`@/services`, `@/models`), never via deep relative paths.
8. **SHOULD** — Comments explain *why* (especially the ML reasoning), not *what*.
9. **SHOULD** — Hot paths (training loop, grid evaluation) avoid allocation per step. Reuse typed arrays.

## 5. Testing

1. **MUST** — Every ML algorithm has a gradient check against finite differences.
2. **MUST** — Every metric has reference-value tests, including edge cases (empty class, all-one-class, NaN input).
3. **MUST** — Every new widget has keyboard and touch support and a Playwright case.
4. **MUST** — A bug fix includes a test that fails without the fix.
5. **MUST** — Service tests use `InMemory*` repositories and a fake clock. Don't mock `localStorage`.
6. **SHOULD** — Engine tests run in Node with no browser. If an `engine` test needs jsdom, that's a sign `engine` isn't pure.
7. **SHOULD** — Tests sit next to the file they test (`ProgressService.test.ts`).

## 6. Performance & accessibility

1. **MUST** — Stay within the bundle budgets in ARCHITECTURE §11. CI fails when they're exceeded.
2. **MUST** — Don't drop below 30 fps while training on the reference mid-range device profile.
3. **MUST** — Every interactive element is keyboard-operable, has an accessible name, and a visible focus ring.
4. **MUST** — Colour is never the only signal. Classes use shape plus colour.
5. **MUST** — Respect `prefers-reduced-motion` and the in-game setting. Sound is off until the user turns it on or interacts.
6. **SHOULD** — Plots offer a text or table alternative for screen readers.

## 7. Persistence

1. **MUST** — Any change to a persisted shape bumps its version and adds a migration plus fixture tests.
2. **MUST** — Never silently delete player progress. Back up corrupt data before resetting.
3. **MUST** — Derive unlocks from progress (in `LevelService`) and never store them.
4. **MUST** — Only repositories (and `platform/`) touch `localStorage`, `sessionStorage` or `indexedDB`. Stores and services never do. oxlint enforces this.

## 8. Dependencies

1. **MUST** — Adding a runtime dependency needs a line in the PR explaining why it's needed and its gzip size.
2. **SHOULD** — Prefer small, well-maintained, MIT-compatible packages. Code is MIT and level content is CC BY 4.0. Don't add GPL code.
3. **MUST** — Use **pnpm** only. `npm`/`yarn` installs are blocked by a `preinstall` guard. Commit only `pnpm-lock.yaml`, never `package-lock.json` or `yarn.lock`.

## 9. Git & PRs

1. **MUST** — Branch from `main`. `main` is always deployable, because every push deploys.
2. **MUST** — Use Conventional Commits: `feat(engine): …`, `feat(services): …`, `fix(level/w1-l4): …`, `content(w2): …`, `docs: …`, `chore: …`.
3. **MUST** — CI is green before merge: typecheck, lint, unit, level validation, pass-bot, build, budgets, Playwright.
4. **SHOULD** — Keep PRs small and single-purpose. A new level is one PR: config, solution, strings and concept card.
5. **SHOULD** — Update ARCHITECTURE.md or an ADR in the same PR that changes the architecture.

## 10. Definition of done (feature or level)

- [ ] Meets the PRD requirement it references (cite the F-id or level number in the PR)
- [ ] Tests added; CI green including pass-bot
- [ ] Works with touch, mouse and keyboard; checked at 360 px width
- [ ] Light and dark themes checked; reduced motion checked
- [ ] Strings externalized; no console errors
- [ ] Docs, schema or ADR updated if behaviour or contracts changed
